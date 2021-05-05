const a = require('express').Router();
const crypto = require('crypto-js');
const rId_auth = require('crypto');
const { Client } = require('discord.js');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const btoa = require('btoa');
const atob = require('atob');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const user = require('../db/user');
const shortURL = require('../db/shortURL');
const userAuth = require('../db/auth');
const log = require('../db/logs/discordMergeLog');
const config = require('../config.json');
const { checkName } = require('../nameProtections');
const { checkPerm } = require('../permissions');
const { authJWT, createAuth } = require('../middleware/auth');

let _url;
if (config.Url == true) _url = "https://www.kaiurl.xyz";
if (config.Url == false) _url = "http://localhost";
const _URL = _url

const secretToken = process.env.SECRET_KEY;

a.get('/', async function (req, res) {
    res.send({OK: true});
});

a.post('/login', createAuth, async function (req, res) {
    let {redirect} = req.query;
    if (!redirect) redirect = "/account";
    return res.json({ OK: true, redirect: redirect });
});

a.post('/register', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;

    let username = req.body.username;
    let password = req.body.password;
    let email = req.body.email;

    if (!email || !password || !username) return res.status(404).json({ OK: false, error: 'You need to enter an email, password and username!' });

    let name = username.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, ''); // Replaces invalid letters.
    if (name.length < 2) return res.json({ OK: false, error: "Username has to be 3 letters or more." });
    if (name.length > 16) return res.json({ OK: false, error: "Username can only be 16 characters." });
    let isBlocked = await checkName(name.toUpperCase());
    if (isBlocked === true || isBlocked === undefined) return res.status(500).json({ OK: false, error: 'Username could not be set. Name could be blocked.' });
    // ENC PASS:
    var parse_pass = crypto.enc.Utf8.parse(password);
    var enc_pass = crypto.enc.Base64.stringify(parse_pass);
    // ENC EMAIL:
    var parse_email = crypto.enc.Utf8.parse(email);
    var enc_email = crypto.enc.Base64.stringify(parse_email);
    var parse_email2 = crypto.enc.Utf8.parse(email.toUpperCase());
    var enc_email2 = crypto.enc.Base64.stringify(parse_email2);

    let rId = Math.random(1).toFixed(20).substring(2);
    let rDiscriminator = Math.random(1).toFixed(4).substring(2);
    let checkUsername = await user.findOne({ officialName: name.toUpperCase() });
    let checkNick = await user.findOne({ nickname: name.toUpperCase() });
    let checkEmail = await user.findOne({ officialEmail: enc_email2 });
    let checkEmail_dec = await user.findOne({ officialEmail: email.toUpperCase() });
    let checkId = await user.findOne({ userid: rId });

    if (checkUsername) return res.json({ "OK": false, error: `Username already exist.` });
    if (checkNick) return res.json({ "OK": false, error: `Nickname already exist.` });
    if (checkEmail) return res.json({ "OK": false, error: `Email already exist.` });
    if (checkEmail_dec) return res.json({ "OK": false, error: `Email already exist.` });
    if (checkId) return res.json({ "OK": false, error: `userId already exist. Please try again.` });
    
    new user({
        officialName: name.toUpperCase(),
        officialEmail: enc_email2,
        userid: rId,
        user: username,
        pass: enc_pass,
        email: enc_email,
        discriminator: rDiscriminator,
        joinDate: Date.now(),
        passwordReset: false,
        ifDiscord: false
    }).save().then(() => {
        res.json({ OK: true, redirect: "account" });
    });
});

a.get('/login/discord', (req, res) => {
    let client_id;
    if (_URL == "http://localhost") client_id = process.env.TEST_CLIENT_ID;
    if (_URL == "https://www.kaiurl.xyz") client_id = process.env.CLIENT_ID;
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${_URL}/api/callback&response_type=code&scope=identify%20email%20connections`);
});

a.get('/callback', async function (req, res) {
    let {code} = req.query;
    if (!code) return res.redirect('/login');

    let CLIENT_ID;
    let CLIENT_SECRET;
    if (_URL == "http://localhost") CLIENT_ID = process.env.TEST_CLIENT_ID;
    if (_URL == "http://localhost") CLIENT_SECRET = process.env.TEST_CLIENT_SECRET;
    if (_URL == "https://www.kaiurl.xyz") CLIENT_ID = process.env.CLIENT_ID;
    if (_URL == "https://www.kaiurl.xyz") CLIENT_SECRET = process.env.CLIENT_SECRET;
    let redirect = `${_URL}/api/callback`;
    let data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect,
        'scope': 'identify'
    };
    
    fetch(`https://discord.com/api/oauth2/token`, {
        method: 'post',
        headers : { 'Content-Type' : 'application/x-www-form-urlencoded' },
        body : _encode(data)
    }).then((r) => r.json()).then(async function(body) {
        let {access_token} = body;
        fetch(`https://discord.com/api/v6/users/@me`, {
            method: 'get',
            headers: { "Authorization": `Bearer ${access_token}` }
        }).then((r) => r.json()).then(async function (b) {
            let {message, email, id, username, discriminator} = b;
            if (message) return res.redirect('/api/login/discord');
            
            var parse_email = crypto.enc.Utf8.parse(email);
            var enc_email = crypto.enc.Base64.stringify(parse_email);
            var parse_email2 = crypto.enc.Utf8.parse(email.toUpperCase());
            var enc_email2 = crypto.enc.Base64.stringify(parse_email2);
            
            let findAccount = await user.findOne({ userid: id });
            let rId = Math.random(1).toFixed(20).substring(2);
            let checkLog = await log.findOne({ discordId: id });
            let authId = rId_auth.randomBytes(16).toString('hex')
            // Check if discord account is linked to kaiurl account
            if (checkLog && checkLog.linked == true) {
            await user.findOne({ _id: checkLog.Id }, async function (e, r) {
                if (e) return res.status(500).send(e);
                if (r && r.discord) {
                    let JWT = jwt.sign({ user: r.userid,  key: rId, id: authId }, secretToken, { expiresIn: '30m' })
                    let checkAuth = await userAuth.findOne({ user: r._id });
                    if (checkAuth) {
                        await userAuth.deleteOne({ _id: checkAuth._id }).then(async () => {
                            new userAuth({
                                date: new Date(),
                                user: r._id,
                                auth: JWT,
                                Id: authId
                            }).save().then(async () => {
                                await user.updateOne({ _id: checkLog.Id }, { $set: { auth_key: rId } }).then(() => {
                                    res.cookie('auth', authId);
                                    res.redirect('/account');
                                });
                            });
                        });
                    } else {
                        new userAuth({
                            date: new Date(),
                            user: r._id,
                            auth: JWT,
                            Id: authId
                        }).save().then(async () => {
                            await user.updateOne({ _id: checkLog.Id }, { $set: { auth_key: rId } }).then(async () => {
                                res.cookie('auth', authId);
                                res.redirect('/account');
                            });
                        });
                    }
                } else {
                    let unlinkData = {
                        OK: `${r._id}`
                    }

                    fetch(`${_URL}/api/discord/unlink`, {
                        method: 'post',
                        headers : { 'Content-Type' : 'application/x-www-form-urlencoded' },
                        body : _encode(unlinkData)
                    }).then((r) => r.json()).then(async function (bo) {
                        if (bo.OK == false) return res.send(bo.error);
                        if (bo.OK == true) return res.redirect('/login');
                    });
                };
            });
            } else {
                await user.findOne({ userid: id }, async function (e, r) {
                    let JWT = jwt.sign({ user: id,  key: rId, id: authId }, secretToken, { expiresIn: '30m' })
                    if (!r) {
                        new user({
                            officialName: username.toUpperCase(),
                            officialEmail: enc_email2,
                            userid: id,
                            user: username,
                            pass: null,
                            email: enc_email,
                            discriminator: discriminator,
                            joinDate: Date.now(),
                            passwordReset: false,
                            ifDiscord: true
                        }).save().then(async (T) => {
                            new userAuth({
                                date: new Date(),
                                user:  T._id,
                                auth: JWT,
                                Id: authId
                            }).save().then(async () => {
                                await user.updateOne({ userid: id }, { $set: { auth_key: rId } }).then(async () => {
                                    res.cookie('auth', authId);
                                    res.redirect('/account');
                                });
                            });
                        });
                    } else {
                       await userAuth.findOne({ user: r._id }, async function (er, re) {
                           if (!re) {
                            new userAuth({
                                date: new Date(),
                                user:  r._id,
                                auth: JWT,
                                Id: authId
                            }).save().then(async () => {
                                await user.updateOne({ userid: id }, { $set: { auth_key: rId } }).then(async () => {
                                    res.cookie('auth', authId);
                                    res.redirect('/account');
                                });
                            });
                           } else {
                            await userAuth.deleteOne({ _id: re._id }).then(() => {
                                new userAuth({
                                    date: new Date(),
                                    user:  r._id,
                                    auth: JWT,
                                    Id: authId
                                }).save().then(async () => {
                                    await user.updateOne({ userid: id }, { $set: { auth_key: rId } }).then(async () => {
                                        res.cookie('auth', authId);
                                        res.redirect('/account');
                                    });
                                });
                            });
                           };
                       });
                    };
                });
            };
        });
    });
});

a.get('/user/:name', async function (req, res) {
    let checkName = await user.findOne({ officialName: req.params.name.toUpperCase() }) || await user.findOne({ nickname: req.params.name });
    let error = { message: `Could not find user ${req.params.name}`, status: 404 };
    if (!checkName) return res.status(404).json({ "OK": false, error });
    if (checkName) return res.json({ "OK": true });
});

a.post('/remove', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.status(401).json({ OK: false, error: { message: `Log in` } });
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.status(401).json({ OK: false, error: { message: `You need to be owner for this` } });
        let {id} = req.body;
        await shortURL.findOne({ short: id }, async function (e, r) {
            if (e) return res.status(500).json({ OK: false, error: e });
            if (!r) return res.status(500).json({ OK: false, error: `Could not find url.` });
            if (r.removed) return res.status(500).json({ OK: false, error: `This url is already removed` });
            await shortURL.updateOne({ short: id }, { $set: { removed: true } }).then(() => { res.json({ OK: true }) });
        });
    });
});

a.post('/add', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.status(401).json({ OK: false, error: { message: `Log in` } });
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.status(401).json({ OK: false, error: { message: `You need to be owner for this` } });
        let {id} = req.body;
        await shortURL.findOne({ short: id }, async function (e, r) {
            if (e) return res.status(500).json({ OK: false, error: e });
            if (!r) return res.status(500).json({ OK: false, error: `Could not find url.` });
            if (!r.removed) return res.status(500).json({ OK: false, error: `This url is already added` });
            await shortURL.updateOne({ short: id }, { $set: { removed: false } }).then(() => { res.json({ OK: true }) });
        });
    });
});

a.post('/email', async function (req, res) {
    console.log(req.body);
    let { email, subject, body } = req.body;
    const transporter = nodemailer.createTransport(smtpTransport({
        host:'webserver3.pebblehost.com',
        secureConnection: false,
        tls: {
          rejectUnauthorized: false
        },
        port: 465,
        auth: {
            user: 'kai@kaiaf.host',
            pass: process.env.PASS,
      }
    }));

      var mailOptions = {
        from: 'support@kaiurl.xyz',
        to: email,
        subject: subject,
        html: body,
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          return res.status(500).json({ OK: false, error: { message: error, status: 500 } });
        } else {
          return `${info.response}`
        }
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

async function bReport(req, res, email, data) {
    const transporter = nodemailer.createTransport(smtpTransport({
        host:'webserver3.pebblehost.com',
        secureConnection: false,
        tls: {
          rejectUnauthorized: false
        },
        port: 465,
        auth: {
            user: 'kai@kaiaf.host',
            pass: process.env.PASS,
      }
    }));

      var mailOptions = {
        from: 'support@kaiurl.xyz',
        to: email,
        subject: 'KaiURL.xyz Bug report',
        html: `A user reported a bug. <a href="${data}">Look at it here</a>`,
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          return res.json({ OK: true });
        }
      });
}

module.exports = a;