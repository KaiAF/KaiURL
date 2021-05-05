const a = require('express').Router();
const fetch = require('node-fetch');

const user = require('../db/user');
const { error404 } = require('../errorPage');

a.get('/api/shrink', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./docs/api/shrink', { u: findUser, theme: theme });
    });
});

module.exports = a;