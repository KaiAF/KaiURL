const news = require('../db/news');
const user = require('../db/user');
const fetch = require('node-fetch');
const time = require('timeago.js');
const { error404 } = require('../errorPage');
const { checkPerm } = require('../permissions');
const likes = require('../db/news/likes');
const comments = require('../db/news/comment');
const a = require('express').Router();

a.get('/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser || await checkPerm(findUser.userid) !== "ADMIN") return res.redirect('/login?redirect=' + req.originalUrl);
        let findNews = await news.find().sort({ date: -1 });
        if (!findNews) findNews = null;
        res.render('./news/admin', { theme: theme, u: findUser, news: findNews });
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
        await news.findOne({ id: req.params.id }, async function (e, r) {
            if (!r) return error404(req, res);
            let author = await user.findOne({ _id: r.user }); if (!author) author = null;
            let like = await likes.find({ news: r._id }).sort({ date: -1 });
            let comment = await comments.find({ news: r._id }).sort({ date: -1 }); 
            let cAuthor = [];
            for (let i = 0; i < comment.length; i++) {
                let FindUser = await user.findOne({ userid: comment[i].user });
                cAuthor.push(`<a href="/${FindUser.userid}">${FindUser.user}:</a> ${comment[i].comment}`);   
            }
            res.render('./news/index', { theme: theme, u: findUser, news: r, time: time, author: author, likes: like, comment: cAuthor });
        });
    });
});

module.exports = a;