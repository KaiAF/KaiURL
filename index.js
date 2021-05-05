const express = require('express');
const a = require('express').Router();
const app = express();
const mongo = require('mongoose');
const fetch = require('node-fetch');
const env = require('dotenv').config();
const path = require('path');

const shorturl = require('./routes/db/shortURL');
const user = require('./routes/db/user');
const userAuth = require('./routes/db/auth');
const pvurl = require('./routes/db/pUrl');
const news = require('./routes/db/news/index');
const { checkPerm } = require('./routes/permissions');
const { error404 } = require('./routes/errorPage');
const { authJWTLogout } = require('./routes/middleware/auth');

console.clear();
// Mongoose Database. You would need to configure your own Mongo URI.
mongo.connect(
    process.env.MONGODB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }).catch(err => {
        console.log('There was an error while trying to connect to the DataBase.')
});

app.set('view engine', "ejs");
app.use(require("cookie-parser")());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api', require('./routes/api/index.js')); // Private information. Everything in there will not be public. Essentially just log in and register stuff.
app.use('/api/discord', require('./routes/api/discord')); // 
app.use('/api/auth', require('./routes/api/auth')); // Auth 
app.use('/account', require('./routes/account/index')); // Account Dashboard.
app.use('/account/edit', require('./routes/account/edit/index')); //
app.use('/r', require('./routes/redirect/index')); // Redirects.
app.use('/shrink', require('./routes/shrink/index')); // Creating the short url.
app.use('/kaipaste', require('./routes/kaipaste/index')); // KaiPaste. Like pastebin, but worse.
app.use('/user', require('./routes/account/user')); // This will display the users Profile.
app.use('/avatar', require('./routes/account/avatar')); // Avatar route.
app.use('/passwordReset', require('./routes/resetP/index')); // Reset passwords!
app.use('/support', require('./routes/support/index')); // Bug reports.
app.use('/changelog', require('./routes/changelog/index')); // Changelogs!
app.use('/docs', require('./routes/docs/index')); // Documentation for new API.
app.use('/jobs', require('./routes/jobs/index')); // Jobs!
app.use('/news', require('./routes/news/index')); // News!
app.use('/i', require('./routes/image/index')); // ShareX Image hosting service.
app.use(express.static('public')); // Public code. Like the script files.

a.get('/', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let findNews = await news.findOne({}).sort({ date: -1 });
        if (!findNews) findNews = null;
        res.render('./home/index', { u: findUser, theme: theme, news: findNews });
    }).catch(e => { console.log(e); res.send('Error') });
});

a.get('/u', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let url = await shorturl.find().sort({ date: -1 });
        res.render('./u/index', { u: findUser, theme: theme, r: url });
    });
});

a.get('/u/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (!findUser || await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res);
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let url = await shorturl.find().sort({ date: -1 });
        res.render('./u/admin', { u: findUser, theme: theme, r: url });
    });
});

// Log in / Register

a.get('/login', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./login/index', { u: findUser, theme: theme });
    });
});

a.get('/register', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./register/index', { u: findUser, theme: theme });
    });
});

a.get('/logout', authJWTLogout, clearCookie, (req, res) => {
    let {q} = req.query;
    if (!q) return res.redirect('/');
    res.redirect(q);
});

// Uninportant pages

a.get('/contact', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./contact/index', { u: findUser, theme: theme });
    });
});

a.get('/tos', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./tos/index', { u: findUser, theme: theme });
    });
});

a.get('/privacy', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./privacy/index', { u: findUser, theme: theme });
    });
});

a.get('/about', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./about/index', { u: findUser, theme: theme });
    });
});

a.get('/credit', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./credit/index', { u: findUser, theme: theme });
    });
});

a.get('/license', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./copyright/index', { u: findUser, theme: theme });
    });
});

a.get('/config.json', async function (req, res) {
    res.sendFile(path.join(__dirname + '/routes/config.json'));
});

// Change-theme

a.post('/change-theme', async function (req, res) {
    let {theme} = req.cookies;
    if (theme) {
        if (theme == 'dark') {
            res.cookie("theme", "light", { maxAge: 3.154e+10 });
            res.json({ OK: true });
        } else {
            res.cookie("theme", "dark", { maxAge: 3.154e+10 });
            res.json({ OK: true });
        }
    } else {
        res.cookie("theme", "dark", { maxAge: 3.154e+10 });
        res.json({ OK: true });
    };
});

// Redirect to FullURL

a.get('/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = null;
    let findUser = null;
    let uA = await userAuth.findOne({ Id: auth });
    if (uA) findUser = await user.findOne({ _id: uA.user });

    await shorturl.findOne({ short: req.params.id }, async function (e, r) {
        if (e) return res.status(500).send(e);
        if (!r) {
            let User = await user.findOne({ officialName: req.params.id.toUpperCase() }) || await user.findOne({ userid: req.params.id });
            if (!User) return error404(req, res);
            if (User) return res.redirect('/user/' + User.user);
        } else {
            if (r.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: findUser, theme: theme });
            let Click = r.clicks;
            let uClick = ++Click;
            await shorturl.updateOne({ short: req.params.id }, { clicks: uClick }).then(() => {
                res.redirect(r.full);
            });
        };
    });
});

// Redirect Private URLs

a.get('/:Name/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = null;
    let findUser = null;
    let uA = await userAuth.findOne({ Id: auth });
    if (uA) findUser = await user.findOne({ _id: uA.user });

    await user.findOne({ officialName: req.params.Name.toUpperCase() }, async function (e, r) {
        if (e) return res.status(500).send(e);
        if (!r) return error404(req, res);
        await pvurl.findOne({ short: req.params.id, userID: r.userid }, async function (er, re) {
            if (!re) return error404(req, res);
            if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: findUser, theme: theme });
            let Click = re.clicks;
            let uClick = ++Click;
            await pvurl.updateOne({ short: req.params.id }, { clicks: uClick }).then(() => {
                res.redirect(re.full);
            });
        });
    });
});

function clearCookie(req, res, next) {
    res.clearCookie("auth");
    next();
};

a.get('*', async function (req, res) {
    error404(req, res);
});

app.use('/', a);

// error handler
app.use(function (err, req, res, next) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    res.status(500).render('./error/index', { theme: theme, u: null, errorMessage: `Error 500! Contact an admin to review this error. <a href="/support">Report here</a> <br> <small>${err.path}</small>` });
    console.log(err);
});

app.listen(process.env.PORT || 80, function () {
    console.log(`Website On`);
});