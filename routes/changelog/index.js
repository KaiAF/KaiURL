const a = require('express').Router();
const date = require('timeago.js');
const fetch = require('node-fetch');
const { checkPerm } = require('../permissions');
const { error404 } = require('../errorPage');

const user = require('../db/user');
const changelog = require('../db/changelog');

a.get('/', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let change = await changelog.find({}).sort({ date: -1 });
        res.render('./changelog/index', { theme: theme, u: findUser, c: change, d: date });
    });
});

a.get('/new', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect(`/login?redirect=${req.originalUrl}`);
        if (await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res);
        res.render('./changelog/new', { theme: theme, u: findUser });
    });
});

a.post('/new', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `You do not have access to this page.`, status: 401 }, code: 1781 });
        if (!findUser) return res.status(401).json({ OK: false, error: { message: `You do not have access to this page.`, status: 401 }, code: 8912 });
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.status(401).json({ OK: false, error: { message: `You do not have access to this page.`, status: 401 }, code: 15621 });
        let { version, title, changes } = req.body;
        if (!changes) return res.status(500).json({ "OK": false, error: `Missing Field "changes"` })
        if (!title) return res.status(500).json({ "OK": false, error: `Missing Field "title"` })
        if (!version) return res.status(500).json({ "OK": false, error: `Missing Field "version"` })

        let id = Math.random().toString(35).substring(5);
        new changelog({
            title: title,
            description: changes,
            version: version,
            date: Date.now(),
            Id: id
        }).save();
        return res.json({ "OK": true });
    });
});

a.get('/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        await changelog.findOne({ Id: req.params.id }, async function (e, r) {
            if (!r) return error404(req, res);
            res.render('./changelog/change', { theme: theme, u: findUser, c: r, d: date });
        });
    });
});

module.exports = a;