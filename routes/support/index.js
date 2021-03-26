const a = require('express').Router();
const fetch = require('node-fetch');

const user = require('../db/user');
const bReport = require('../db/bug');
const config = require('../config.json');

a.get('/', async function (req,res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let check_user = await user.findOne({ _id: auth, userid: req.cookies.token, auth_key: auth_key });
    let auser;
    if (check_user == null) auser = null
    if (check_user) auser = check_user;
    res.render('./support/home/index', { theme: theme, u: auser });
});

a.get('/admin', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let check_user = await user.findOne({ _id: auth, userid: req.cookies.token, auth_key: auth_key });
    if (check_user == null) return res.status(404).render('./error/index', { errorMessage: `You need to be an admin to view this page!`, theme: theme });
    if (check_user.perms !== "ADMIN") return res.status(404).render('./error/index', { errorMessage: `You need to be an admin to view this page!`, theme: theme });
    let bug = await bReport.find();
    if (check_user) return res.render('./support/home/admin', { theme: theme, u: check_user, b: bug });
});

a.get('/report-bug', async function (req,res) {
    let theme = req.cookies.Theme;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    if (!theme) theme = null;
    let auser;
    let check_user = await user.findOne({ _id: auth, userid: req.cookies.token, auth_key: auth_key });
    if (check_user == null) auser = null;
    if (check_user) auser = check_user;
    res.render('./support/bug/index', { theme: theme, u: auser });
});

a.post('/report-bug/submit', async function (req, res) {
    let theme = req.cookies.Theme;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    if (!theme) theme = null;
    let auser;
    let check_user = await user.findOne({ _id: auth, userid: req.cookies.token, auth_key: auth_key });
    if (check_user == null) auser = null;
    if (check_user) auser = check_user.userid;
    let r = Math.random(1).toFixed(15).substring(2);
    new bReport({
        title: req.body.title,
        description: req.body.bug_detail,
        reproduce: req.body.bug_reproduce,
        bugId: r,
        date: Date.now(),
        userId: auser,
        status: "Waiting.."
    }).save().then(async () => {
        res.json({ "OK": true, message: `Bug Report was created. Thanks.`, bugId: r });
        await fetch(`${config.Url}/api/report${r}`, {
            method: 'post'
        });
    });
});

a.post('/report-bug/reportId/:id/comment', async function (req, res) {
    let theme = req.cookies.Theme;
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    if (!theme) theme = null;
    let checkUser = await user.findOne({ _id: auth, userid: req.cookies.token, auth_key: auth_key });
    if (checkUser == null) return res.status(503).render('./error/index', { theme: theme, errorMessage: `You need to be logged in to comment on this issue` });
    await bReport.findOne({ bugId: req.params.id }, async function (err, re) {
       if (err) return console.log(err); 
       if (re == null) return res.status(500).render('./error/index', { theme: theme, errorMessage: `Could not find bug report!` });
       if (re) {
           await bReport.updateOne({ _id: re._id }, { $push: { comment: [`userId-${checkUser.userid}|${req.body.comment}`] } }).then(() => {
               res.redirect('/support/report-bug/reportId/' + re.bugId);
           });
       };
    });
});

a.post('/report-bug/reportId/:id/status', async function (req, res) {
    res.send('flushed');
});

a.get('/report-bug/reportId/:id', async function (req,res ){
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let checkId = await bReport.findOne({ bugId: req.params.id });
    if (checkId == null) return res.render('./error/index', { theme: theme, errorMessage: `Could not find the report you were looking for.` });
    let auth = req.cookies.auth;
    let auth_key = req.cookies.auth_key;
    let check_user = await user.findOne({ _id: auth, userid: req.cookies.token, auth_key: auth_key });
    if (check_user == null) return res.render('./error/index', { theme: theme, errorMessage: `You need to be logged in to view this page. If you reported without an account, you can't view this page.` });
    if (check_user.userid == null && checkId.userId == null) return res.render('./error/index', { theme: theme, errorMessage: `You need to be logged in to view this page. If you reported without an account, you can't view this page.` });
    if (check_user.perms === "ADMIN") return res.render('./support/bug/bug', { bug: checkId, u: check_user, theme: theme, admin: true, user: user });
    if (check_user.userid === checkId.userId) {
        res.render('./support/bug/bug', { bug: checkId, u: check_user, theme: theme, admin: false, user: user });
    } else {
        return res.render('./error/index', { theme: theme, errorMessage: `You need to be logged in to view this page. If you reported without an account, you can't view this page.` });
    };
});

module.exports = a;
