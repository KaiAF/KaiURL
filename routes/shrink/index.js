const a = require('express').Router();
const path = require('path');
const fetch = require('node-fetch');

const user = require('../db/user');
const shortURL = require('../db/shortURL');
const pvURL = require('../db/pUrl');

// These are blocked urls. So no one can do ip grabbers :)
const blocked_urls = ['http://localhost', 'http://grabify.link', 'http://iplogger.org', 'http://adfoc.us', 'http://detonnot.com', 'http://adf.ly', 'http://minilink.xyz', 'http://www.localhost', 'http://www.grabify.link', 'http://www.iplogger.org', 'http://www.adfoc.us', 'http://www.detonnot.com', 'http://www.adf.ly', 'http://www.minilink.xyz']

a.get('/', async function (req, res) {
  let userid = req.cookies.token;
  let username = req.cookies.userName;
  let theme = req.cookies.Theme;
  let my_id = req.cookies.Latest_id;
  let short = await shortURL.findOne({ short: my_id }) || await pvURL.findOne({ short: my_id });
  if (!theme) theme = null
  if (!short) return res.redirect('/');
  if (userid && username) {
    let check_user = await user.findOne({ userid: userid, user: username });
    if (check_user == null) {
        res.clearCookie("token");
        res.clearCookie("userName");
        res.redirect('/');
    } else {
        res.render('./home/directUrl', { u: check_user, log: true, theme: theme, url: short });
    }
    } else {
        res.render('./home/directUrl', { u: null, log: false, theme: theme, url: short });
    };
});

a.post('/', async function (req, res) {
  let r = Math.random().toString(35).substring(7);
  let url = req.body.FullURL;
  if (!url || url.indexOf(' ') >= 0) return res.json({ "OK": false, error: `Please enter a valid url.` }); // Checks if the url has white spaces. Or if they provide nothing.
  validateUrl(req, res, url, r, "false");
});

a.post('/private', async function (req, res) {
  let r = Math.random().toString(35).substring(7);
  let url = req.body.FullURL;
  if (!url || url.indexOf(' ') >= 0) return res.json({ "OK": false, error: `Please enter a valid url.` });
  validateUrl(req, res, url, r, "true");
});

async function validateUrl(req, res, url, r, type) {
  let first = url.replace('https://', 'http://')
  let second = first.replace('http://', '')
  let final = second.substr(0, second.lastIndexOf('/'))
  let actualURL;
  if (!second) actualURL = first
  if (second) actualURL = "http://" + second;
  // This checks if the url is blocked. It's hard coded to be http://example.com. It's easier on the fetch package, and to see if the url is blocked.
  if (blocked_urls.includes(actualURL)) {
    return res.json({ "OK": false, error: `Blocked URL` })
  } else {
    let a = await fetch(`${actualURL}`, { method: 'get' }).catch(e => { });
    if (!a) return res.json({ "OK": false, error: `Could not validate url.` });
    if (type == "false") {
      createURL(req, res, shortURL, actualURL, r)
    } else {
      createURLPrivate(req, res, pvURL, actualURL, r);
    }
  }
}

function createURL(req, res, createURL, url, r) {
  createURL.create({
    full: `${url}`,
    short: r,
    Domain: req.body.domain,
    date: new Date().toUTCString(),
    clicks: 0
  }).then(() => {
    res.cookie("Latest_id", r);
    res.json({ "OK": true, error: null });
  });
}

function createURLPrivate(req, res, createURL, url, r) {
  createURL.create({
    full: `${url}`,
    short: r,
    Domain: req.body.domain,
    date: new Date().toUTCString(),
    clicks: 0,
    userID: req.cookies.token
   }).then(() => {
     res.cookie("Latest_id", r);
     res.json({ "OK": true, error: null });
   });
}

module.exports = a;