const a = require('express').Router();
const date = require('timeago.js');
const { checkPerm } = require('../permissions');
const { error404 } = require('../errorPage');

const user = require('../db/user');
const changelog = require('../db/changelog');

a.get('/', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let checkUser = await user.findOne({ _id: auth, auth_key: auth_key });
    if (checkUser == null) checkUser = null
    let change = await changelog.find({}).sort({ date: -1 });
    res.render('./changelog/index', { theme: theme, u: checkUser, c: change, d: date });
});

a.get('/new', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let checkUser = await user.findOne({ _id: auth, auth_key: auth_key });
    if (checkUser == null) return error404(req, res);
    if (await checkPerm(checkUser.userid) !== "ADMIN") return error404(req, res);
    res.render('./changelog/new', { theme: theme, u: checkUser });
});

a.post('/new', async function (req, res) {
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let checkUser = await user.findOne({ _id: auth, auth_key: auth_key });
    
    if (checkUser == null) return res.status(403).json({ "OK": false, error: `Only admins can access this.` });
    if (await checkPerm(checkUser.userid) !== "ADMIN") return error404(req, res);

    let vName = req.body.version;
    let title = req.body.title;
    let changes = req.body.changes;

    if (!changes) return res.status(500).json({ "OK": false, error: `Missing Field "changes"` })
    if (!title) return res.status(500).json({ "OK": false, error: `Missing Field "title"` })
    if (!vName) return res.status(500).json({ "OK": false, error: `Missing Field "version"` })

    let id = Math.random().toString(35).substring(5);
    new changelog({
        title: title,
        description: changes,
        version: vName,
        date: Date.now(),
        Id: id
    }).save();

    return res.json({ "OK": true, error: null });
})

a.get('/:id', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let checkUser = await user.findOne({ _id: auth, auth_key: auth_key });
    if (checkUser == null) checkUser = null
    await changelog.findOne({ Id: req.params.id }, async function (err, re) {
        if (err) return console.log(err);
        if (re == null) return error404(req, res);
        if (re) return res.render('./changelog/change', { theme: theme, u: checkUser, c: re, d: date });
    });
});

module.exports = a;