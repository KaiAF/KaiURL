const a = require('express').Router();
const path = require('path');
const { error404 } = require('../errorPage');

const shorturl = require('../db/shortURL');
const pvurl = require('../db/pUrl');

a.get('/twitter', (req, res) => {
    res.redirect("https://twitter.com/loudkai");
});

a.get('/discord-acc', (req, res) => {
    res.redirect("https://www.discord.com/users/357248412061663235");
});

a.get('/source', (req, res) => {
  res.redirect(`https://github.com/kaiaf/kaiurl`);
});

a.get('/:id/find', async function (req, res) {
    let find_shortUrl = await shorturl.findOne({ short: req.params.id }, { short: 1, full: 1, clicks: 1, official: 1, date: 1, _id: 0 }).exec();
    let find_pvUrl = await pvurl.findOne({ short: req.params.id }, { short: 1, full: 1, clicks: 1, date: 1, userID: 1, _id: 0 }).exec();

    res.header("Content-Type",'application/json');
    if (find_shortUrl) return res.send(JSON.stringify(find_shortUrl, null, 2.5));
    if (find_pvUrl) return res.send(JSON.stringify(find_pvUrl, null, 2.5));

    if (!find_pvUrl && !find_shortUrl) return res.status(404).send(`Could not find URL`);
});

a.use(function (req, res, next) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    res.status(404).render('./error/index', {
        errorMessage: `This page was not found.`,
        u: null, log: false, theme: theme
    });
});

module.exports = a;
