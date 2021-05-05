const a = require('express').Router();
const crypto = require('crypto-js');
const fetch = require('node-fetch');
const { checkPerm } = require('../permissions');
const { error404 } = require('../errorPage');

const text = require('../db/kaipaste');
const user = require('../db/user');

a.get('/', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        res.render('./kaipaste/index', { theme: theme, u: findUser });
    });
});

a.get('/create', async function (req, res) {
    res.redirect('/kaipaste');
});

a.post('/create', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let error = { message: `Could not authenticate request.`, status: 401 };
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.status(401).json({ OK: false, error, code: 1278 });
        let {title, desc} = req.body;
        if (!title || !desc) return res.status(500).json({ OK: false, error: { message: `You left one of the fields blank!`, status: 500 } });
        let rId = Math.random().toString(35).substring(5);
        new text({
            user: findUser._id,
            title: title,
            description: desc,
            id: rId,
            date: new Date()
        }).save().then(() => {
            return res.json({ "OK": true, message: `/kaipaste/${rId}` });
        });
    });
});

a.get('/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.sendStatus(401);
        let kP = await text.find();
        res.render('./kaipaste/admin/index', { theme: theme, u: findUser, paste: kP });
    });
});

a.post('/remove/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.sendStatus(401);
        let kP = await text.findOne({ _id: req.params.id });
        if (!kP) return error404(req, res);
        if (kP.removed) return res.status(500).json({ OK: false, error: { message: `Paste is already removed.`, status: 500 }, code: 1289 });
        await text.updateOne({ _id: kP._id }, { $set: { removed: true } }).then(() => {
            return res.redirect('/kaipaste/admin');
        });
    });
});

a.post('/add/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.sendStatus(401);
        let kP = await text.findOne({ _id: req.params.id });
        if (!kP) return error404(req, res);
        if (!kP.removed) return res.status(500).json({ OK: false, error: { message: `Paste is already added.`, status: 500 }, code: 1289 });
        await text.updateOne({ _id: kP._id }, { $set: { removed: false } }).then(() => {
            return res.redirect('/kaipaste/admin');
        });
    });
});

a.post('/:user/:id/remove', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.status(401).json({ OK: false, error: { message: `You do not have access to this page.`, status: 401 }, code: 1891 });
        let kP = await text.findOne({ id: req.params.id, user: req.params.user });
        if (!kP) return res.status(404).json({ OK: false, error: { message: `Could not find Paste`, status: 404 } });
        if (findUser._id === kP.user) return res.status(401).json({ OK: false, error: { message: `You do not have access to this page.`, status: 401 }, code: 1786 });
        if (kP.removed) return res.status(500).json({ OK: false, error: { message: `Paste is already removed.`, status: 500 }, code: 1289 });
        await text.updateOne({ _id: kP._id }, { $set: { removed: true } }).then(() => {
            return res.redirect('/account');
        });
    });
});

a.get('/:id/edit', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        let kP = await text.findOne({ id: req.params.id });
        if (!kP) return error404(req, res);

        if (findUser._id == kP.user) return res.render('./kaipaste/edit', { theme: theme, u: findUser, text: kP });
        res.sendStatus(401);
    });
});

// This request makes the changes.
a.post('/:id/edit', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        let error = { message: `Could not authenticate request`, status: 401 };
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error, code: 1891 });
        if (!findUser) return res.status(401).json({ OK: false, error, code: 8712 });
        let kP = await text.findOne({ _id: req.params.id });
        if (!kP) return error404(req, res);

        if (findUser._id == kP.user) {
            await text.updateOne({ _id: kP._id }, { $set: { description: req.body.text } }).then(() => { res.redirect(`/kaipaste/${kP.id}`) });
        } else {
            res.sendStatus(401);
        };
    });
});

a.get('/:id', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    await text.findOne({ id: req.params.id }, async function (err, re) {
        if (err) return res.send(err);
        if (re == null) return error404(req, res);
        if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
        res.write(re.description);
        res.send();
    });
});

a.get('/:user/:id', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    await user.findOne({ officialName: req.params.user.toUpperCase() }, async function (e, r) {
        await text.findOne({ user: r._id, id: req.params.id }, async function (err, re) {
            if (err) return res.send(err);
            if (re == null) return error404(req, res);
            if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
            res.write(re.description);
            res.send();
        });
    });
});

module.exports = a;
