const mongo = require('mongoose');
const a = require('express').Router();
const fetch = require('node-fetch');
const { acceptPolicy } = require('../middleware/accept');
const { authJWT, createAuth } = require('../middleware/auth');

const user = require('../db/user');
const log = require('../db/logs/discordMergeLog');
const config = require('../config');
const userDiscord = require('../db/userDiscord');
const { error404 } = require('../errorPage');

let _url;
if (config.Url == true) _url = "https://www.kaiurl.xyz";
if (config.Url == false) _url = "http://localhost";
const _URL = _url

a.get('/link/callback', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=/account/edit');
        let {code} = req.query;
        if (!code) return res.redirect('/api/discord/link');
        let CLIENT_ID;
        let CLIENT_SECRET;
        if (_URL == "http://localhost") CLIENT_ID = process.env.TEST_CLIENT_ID_LINK; if (_URL == "http://localhost") CLIENT_SECRET = process.env.TEST_CLIENT_SECRET_LINK;
        if (_URL == "https://www.kaiurl.xyz") CLIENT_ID = process.env.CLIENT_ID_LINK; if (_URL == "https://www.kaiurl.xyz") CLIENT_SECRET = process.env.CLIENT_SECRET_LINK;
        let redirect = `${_URL}/api/discord/link/callback`;
        let data = {
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect,
            'scope': 'identify'
        };

        fetch(`https://discord.com/api/oauth2/token`, {
            method: "post",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: _encode(data)
        }).then((r) => r.json()).then(async function (body) {
            let {access_token} = body;
            fetch(`https://discord.com/api/v6/users/@me`, {
                method: 'get',
                headers: { "Authorization": `Bearer ${access_token}` }
            }).then((r) => r.json()).then(async function (b) {
                if (b.message) return res.redirect('/api/discord/link');
                let {theme, auth} = req.cookies;
                let response = {
                    id: b.id,
                    username: b.username,
                    avatar: b.avatar,
                    discriminator: b.discriminator,
                    public_flags: b.public_flags,
                    mfa_enabled: b.mfa_enabled,
                    email: b.email,
                    verified: b.verified,
                    callbackCode: req.query.code,
                    auth: auth,
                    date: new Date(),
                    logId: Math.random().toString(36).substring(2),
                };
                let checkLog = await log.findOne({ discordId: b.id });
                if (checkLog && checkLog.user && checkLog.linked == true) return res.status(401).render('./error/index', { theme: theme, u:null, errorMessage: `Discord account is already linked to ${checkLog.user}.` });
                if (checkLog) await checkLog.deleteOne({ _id: checkLog._id });
                fetch(`${_URL}/api/discord/link?auth=${auth}`, {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: _encode(response)
                }).then((r) => r.json()).then(async function (r) {
                    if (r.OK == false) return res.status(r.error.status).render('./error/index', { theme: theme, u:null, errorMessage: `${r.error.message}. Error Code: ${r.code}` });
                    if (r.OK == true) return res.redirect('/account/edit');
                });
            });
        });
    });
});

a.get('/link', async function (req, res) {
    let client_id;
    if (_URL == "http://localhost") client_id = process.env.TEST_CLIENT_ID_LINK;
    if (_URL == "https://www.kaiurl.xyz") client_id = process.env.CLIENT_ID_LINK;
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${_URL}/api/discord/link/callback&response_type=code&scope=identify%20email%20connections`);
});

a.post('/link', async function (req, res) {
    let {auth} = req.query;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request`, status: 401 }, code: 214789 });
        if (!findUser) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request`, status: 401 }, code: 1829 });
        let { id, username, avatar, discriminator, mfa_enabled, email, verified, callbackCode, auth, date, logId } = req.body;
        if (!id || !username || !avatar || !discriminator || !email || !verified || !callbackCode || !auth || !date || !logId) return res.status(401).json({ OK: false, error: { message: `Missing required fields`, status: 401 }, code: 12134 });
        await log.findOne({ discordId: id }, async function (e, r) {
            if (r) {
                log.updateOne({ _id: r._id }, { $set: {
                    user: findUser.username,
                    Id: findUser._id,
                    discordId: id,
                    discordName: username,
                    discordDisc: discriminator,
                    linkDate: date,
                    logId: logId,
                    linked: true
                } }).then(async () => {
                    user.updateOne({ _id: findUser._id }, { $set: { discord: id } }).then(async () => {
                        await userDiscord.findOne({ userId: id }, async function (e, re) {
                            if (re) {
                                userDiscord.updateOne({ _id: re._id }, { $set: {
                                username: username,
                                userId: id,
                                userDisc: discriminator,
                                avatarHash: avatar,
                                verified: verified,
                                email: email,
                                mfa: mfa_enabled,
                                lastUpdated: new Date()
                                } }).then(() => { res.json({ OK: true }) });
                            } else {
                                new userDiscord({
                                    username: username,
                                    userId: id,
                                    userDisc: discriminator,
                                    avatarHash: avatar,
                                    verified: verified,
                                    email: email,
                                    mfa: mfa_enabled,
                                    lastUpdated: new Date()
                                }).save().then(() => { res.json({ OK: true }) });
                            }
                        });
                    });
                });
            } else {
                new log({
                    user: findUser.username,
                    Id: findUser._id,
                    discordId: id,
                    discordName: username,
                    discordDisc: discriminator,
                    linkDate: date,
                    logId: logId,
                    linked: true
                }).save().then(async () => {
                    user.updateOne({ _id: findUser._id }, { $set: { discord: id } }).then(async () => {
                        await userDiscord.findOne({ userId: id }, async function (e, re) {
                            if (re) {
                                userDiscord.updateOne({ _id: re._id }, { $set: {
                                username: username,
                                userId: id,
                                userDisc: discriminator,
                                avatarHash: avatar,
                                verified: verified,
                                email: email,
                                mfa: mfa_enabled,
                                lastUpdated: new Date()
                                } }).then(() => { res.json({ OK: true }) });
                            } else {
                                new userDiscord({
                                    username: username,
                                    userId: id,
                                    userDisc: discriminator,
                                    avatarHash: avatar,
                                    verified: verified,
                                    email: email,
                                    mfa: mfa_enabled,
                                    lastUpdated: new Date()
                                }).save().then(() => { res.json({ OK: true }) });
                            }
                        });
                    });
                });
            };
        });
    });
});

a.post('/unlink', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request`, status: 401 }, code: 8911 });
        if (!findUser) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request`, status: 401 }, code: 124678 });
        let Log = await log.findOne({ Id: findUser._id });
        if (!Log) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request`, status: 401 }, code: 789241 });
        log.updateOne({ _id: Log._id }, { $set: { linked: false, unlinkedDate: new Date() } }).then(() => {
            user.updateOne({ _id: findUser._id }, { $set: { discord: null } }).then(() => {
                userDiscord.deleteOne({ userId: Log.discordId }).then(() => {
                    res.redirect('/account/edit');
                });
            });
        });
    });
});

function _encode(data) {
    let string = "";
    for (let [key,value] of Object.entries(data)) {
        if (!value) continue;
        string += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }
    return string.substring(1);
};

module.exports = a;