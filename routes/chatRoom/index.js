const a = require('express').Router();
const fetch = require('node-fetch');
const time = require('timeago.js');
const { error404 } = require('../errorPage');
const user = require('../db/user');
const rooms = require('../db/rooms');
const status = require('../db/rooms/users/status');
const messages = require('../db/rooms/messages');

a.get('/', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let room = await rooms.find().sort({ date: -1 });
        res.render('./room/index', { theme: theme, u: findUser, room: room });
    });
});

a.post('/create', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: 'You need to be logged in to create guilds.', status: 401 } });
        if (!findUser) return res.status(401).json({ OK: false, error: { message: 'You need to be logged in to create guilds.', status: 401 } });
        let { name } = req.body;
        if (!name) return res.status(404).json({ OK: false, error: { message: `Missing required fields` } });
        let id = Math.random(1).toFixed(22).substring(2)
        new rooms({
            date: new Date(),
            guildName: name,
            guildId: id,
            guildOwner: findUser.userid
        }).save().then(() => { res.json({ OK: true, redirect: `/${findUser.userid}/${id}` }); });
    });
});

a.get('/:id/:userid/status', async function(req, res) {
    let findUser = await user.findOne({ userid: req.params.userid });
    if (!findUser) return res.json({ OK: false });
    await rooms.findOne({ guildId: req.params.id }, async function(e, r) {
        if (!r) return res.status(500).json({ OK: false, error: { message: `Could not find guild` } });
        await status.findOne({ userid: findUser.userid, guildId: req.params.id }, async function(e, re) {
            if (!re) return res.status(500).json({ OK: false, error: { message: `Could not find user` } });
            let findAvatar = await fetch(`http://${req.hostname}/avatar/${findUser.userid}.png`)
            let avatar = false;
            if (findAvatar.status == 200) avatar = true;
            let User = {
                name: findUser.user,
                id: findUser.userid,
                status: re.status,
                avatar: avatar
            }
            res.json({ OK: true, User });
        });
    });
});

a.post('/:id/join', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not autenticate request` } });
        if (!findUser) return res.status(401).json({ OK: false });
        await rooms.findOne({ guildId: req.params.id }, async function(e, r) {
            if (!r) return res.status(500).json({ OK: false, error: { message: `Could not find guild` } });
            if (r.members.includes(`${findUser.userid}`)) {
                res.json({ OK: true });
            } else {
                rooms.updateOne({ _id: r._id }, { $push: { members: findUser.userid } }).then(() => {
                    res.json({ OK: true });
                });
            };
        });
    });
});

a.get('/:id/users/', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        await rooms.findOne({ guildId: req.params.id }, async function(e, r) {
            if (!r) return res.status(500).json({ OK: false, error: { message: `Could not find guild` } });
            let findUsers = await status.find({ guildId: r.guildId });
            res.json(findUsers);
        });
    });
});

a.get('/:id/message/:messageid', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        await messages.findOne({ messageId: req.params.messageid, guildId: req.params.id }, async function(e, r) {
            if (!r) return res.status(404).json({ OK: false });
            res.json({
                OK: true,
                User: {
                    name: r.user,
                    id: r.userId,
                    avatar: r.avatar,
                    message: r.message
                }
            });
        });
    });
});

a.get('/:id', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        await rooms.findOne({ guildId: req.params.id }, async function(e, r) {
            if (!r) return error404(req, res);
            res.send(r);
        });
    });
});

module.exports = a;