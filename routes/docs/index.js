const a = require('express').Router();

const user = require('../db/user');

a.get('/api/shrink', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let auth = req.cookies.auth;
    let checkUser = await user.findOne({ _id: auth, userid: req.cookies.token });
    if (!checkUser) checkUser = null;
    res.render('./docs/api/shrink', { theme: theme, u: checkUser });
});

module.exports = a;