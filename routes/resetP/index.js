const a = require('express').Router();
const time = require('timeago.js');
const { error404 } = require('../errorPage');

const user = require('../db/user');

a.get('/', async function (req,res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    if (req.query.q) {
        await user.findOne({ resetId: req.query.q }, async function (err, re) {
            if (err) return res.send(err);
            if (re == null) return res.render('./passwordReset/index', { theme: theme, u: null });
            let a = re.sinceLastReset
            let b = Date.now() - (5 * 60 * 1000)
            if (a < b) return res.render('./error/index', { theme: theme, errorMessage: `Password reset link expired.` });
            return res.render('./passwordReset/pReset', { u: re, theme: theme });
        });
    } else {
    res.render('./passwordReset/index', {
        theme: theme,
        u: null
    });
}
});

module.exports = a;