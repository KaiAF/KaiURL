const a = require('express').Router();
const path = require('path');
const { error404 } = require('../errorPage');

const shorturl = require('../db/shortURL');
const pvurl = require('../db/pUrl');
const config = require('../config.json');

let _url;
if (config.Url == true) _url = "https://www.kaiurl.xyz";
if (config.Url == false) _url = "http://localhost";
const _URL = _url

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
    let url;
    if (_URL == "https://www.kaiurl.xyz" || _URL == "http://localhost" && config.debug == false) url = "https://api.kaiurl.xyz";
    if (_URL == "http://localhost" && config.debug == true) url = "http://localhost:3000"
    res.redirect(`${url}/${req.params.id}`);
});

module.exports = a;
