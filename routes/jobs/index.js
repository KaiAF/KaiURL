const a = require('express').Router();
const fetch = require('node-fetch');

const user = require('../db/user');

a.get('/dev', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = "";
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./jobs/index', { u: findUser, theme: theme });
    });
});

module.exports = a;