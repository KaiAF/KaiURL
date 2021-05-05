const a = require('express').Router();
const fetch = require('node-fetch');
const { error404 } = require('../errorPage');
const { checkPerm } = require('../permissions');

const user = require('../db/user');
const bReport = require('../db/bugreports/bug');
const bugComments = require('../db/bugreports/comments');
const config = require('../config.json');

let _url;
if (config.Url == true) _url = "https://www.kaiurl.xyz";
if (config.Url == false) _url = "http://localhost";
const _URL = _url

a.get('/', async function (req,res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./support/home/index', { theme: theme, u: findUser });
    });
});

a.get('/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.redirect('/login?redirect=' + req.originalUrl);
        let bug = await bReport.find();
        res.render('./support/home/admin', { theme: theme, u: findUser, b: bug });
    });
});

a.get('/report', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./support/bug/index', { theme: theme, u: findUser });
    });
});

a.post('/report/submit', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: {message: 'Could not authenticate request', status: 401}, code: 891 });
        if (!findUser) return res.status(401).json({ OK: false, error: {message: 'Could not authenticate request', status: 401}, code: 890 });
        let r = Math.random(1).toFixed(15).substring(2);
        new bReport({
            title: req.body.title,
            description: req.body.bug_detail,
            reproduce: req.body.bug_reproduce,
            bugId: r,
            date: Date.now(),
            userId: findUser.userid,
            status: "Waiting.."
        }).save().then(async () => {
            let data = {
                email: 'kaiaf@protonmail.com',
                subject: 'New Bug Report!',
                body: `<a href="${_URL}/support/report/${r}">${_URL}/support/report/${r}</a>`
            }
            fetch(`${_URL}/api/email`, { method: 'post', body: _encode(data), headers : { 'Content-Type' : 'application/x-www-form-urlencoded' } }).then((r) => r.json()).then(async (b) => {
                if (b.OK) return res.json({ "OK": true, message: `Bug Report was created. Thanks.`, bugId: r });
                res.json({ OK: false, error: { message: b.error.message, status: b.error.status } });
            });
        });
    });
});

a.get('/report/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=' + req.originalUrl);
        await bReport.findOne({ bugId: req.params.id }, async function (e, r) {
            if (!r) return error404(req, res);
            let bComments = await bugComments.find({ reportId: r._id });
            if (!bComments) bComments = null;
            await user.findOne({ userid: r.userId }, async function (e, re) {
                if (!re) return error404(req, res);
                if (findUser.perms == "OWNER") {
                    res.render('./support/bug/bug', { bug: r, u: findUser, theme: theme, admin: true, user: r, comment: bComments });
                } else if (re.userid === findUser.userid) {
                    res.render('./support/bug/bug', { bug: r, u: findUser, theme: theme, admin: false, user: r, comment: bComments });
                } else {
                    error404(req, res);
                };
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
