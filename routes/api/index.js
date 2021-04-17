const a = require('express').Router();
const crypto = require('crypto-js');
const SHA256 = require('crypto-js/sha256');
const timeago = require('timeago.js');
const { Client } = require('discord.js');
const btoa = require('btoa');
const atob = require('atob');
const path = require('path');
const client = new Client();
const env = require('dotenv').config();
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const { checkName } = require('../nameProtections');
const { error404 } = require('../errorPage');

const user = require('../db/user');
const shortURL = require('../db/shortURL');
const bRep = require('../db/bug');
const config = require('../config.json');

let CLIENT_ID;
let CLIENT_SECRET;

if (config.Url == "http://localhost") CLIENT_ID = process.env.TEST_CLIENT_ID;
if (config.Url == "http://localhost") CLIENT_SECRET = process.env.TEST_CLIENT_SECRET;
if (config.Url == "https://www.kaiurl.xyz") CLIENT_ID = process.env.CLIENT_ID;
if (config.Url == "https://www.kaiurl.xyz") CLIENT_SECRET = process.env.CLIENT_SECRET;
const redirect = `${config.Url}/api/callback`;

// Log in with KaiURL.xyz Account

a.post('/login', async function (req, res) {
    let username = req.body.username.toUpperCase();
    let pass = req.body.password;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let red;
    if (req.query.redirect) red = req.query.redirect;
    if (!req.query.redirect) red = null;
    if (username && pass) {
        // ENC PASS:
        var parse_pass = crypto.enc.Utf8.parse(pass);
        var enc_pass = crypto.enc.Base64.stringify(parse_pass);
        let validate_user = await user.findOne({ officialName: username, pass: enc_pass }) || await user.findOne({ nickname: req.body.username, pass: enc_pass });
        if (validate_user == null) return res.json({ "OK": false, error: `Could not find user.` });
        if (validate_user) {
            let r = Math.random(1).toFixed(17).substring(2);
            await user.updateOne({ _id: validate_user._id }, { $set: { auth_key: r } }).then(() => {
                res.cookie('token', validate_user.userid);
                res.cookie('userName', validate_user.user);
                res.cookie('auth_key', r);
                res.cookie('auth', validate_user._id);
                res.json({ 'OK': true, redirect: `${red}`, error: null });
            });
        };
    } else {
        res.json({ "OK": false, error: `You need to enter a username and password.` })
    }
});

a.post('/register', async function (req, res) {
    let username = req.body.username;
    let pass = req.body.password;
    let email = req.body.email

    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    
    let red;
    if (req.query.redirect == "/kaipaste") red = 'kaipaste';
    if (req.query.redirect !== "/kaipaste") red = 'account';

    if (email && pass && username) {
        // This will replace non-ascii cahrachetersssssss.
        let name = username.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
        // Username length has to be 3 characters or more.
        if (name.length > 2) {
        if (name.length > 16) return res.json({ "OK": false, error: `Name can only be 16 characters.` });
        // Check if the name is blocked.
        let checkname = name.toUpperCase();
        let check_block = await checkName(req, res, checkname)
        if (check_block === true || check_block === undefined) return res.json({ "OK": false, error: `Username could not be set. ` })
        // ENC PASS:
        var parse_pass = crypto.enc.Utf8.parse(pass);
        var enc_pass = crypto.enc.Base64.stringify(parse_pass);
        // ENC EMAIL:
        var parse_email = crypto.enc.Utf8.parse(email);
        var enc_email = crypto.enc.Base64.stringify(parse_email);
        var parse_email2 = crypto.enc.Utf8.parse(email.toUpperCase());
        var enc_email2 = crypto.enc.Base64.stringify(parse_email2);

        let random_id = Math.random(1).toFixed(20).substring(2);

        let check_username = await user.findOne({ officialName: checkname });
        let check_nick = await user.findOne({ nickname: checkname });
        let check_email = await user.findOne({ officialEmail: enc_email2 });
        let check_email_dec = await user.findOne({ officialEmail: email.toUpperCase() });
        let check_id = await user.findOne({ userid: random_id });

        if (check_username) return res.json({ "OK": false, error: `Username already exist.` });
        if (check_nick) return res.json({ "OK": false, error: `Nickname already exist.` });
        if (check_email) return res.json({ "OK": false, error: `Email already exist.` });
        if (check_email_dec) return res.json({ "OK": false, error: `Email already exist.` });
        if (check_id) return res.json({ "OK": false, error: `userID already exist. Please try again.` });

        new user({
            userid: random_id,
            user: name,
            pass: enc_pass,
            email: enc_email,
            role: "User",
            joinDate: Date.now(),
            officialName: name.toUpperCase(),
            officialEmail: enc_email2,
            ifDiscord: false
        }).save().then(() => {
            res.cookie("token", random_id);
            res.cookie('userName', name);
            res.json({ "OK": true, redirect: `${red}`, error: null })
        })
        } else {
            res.json({ "OK": false, error: `Username has to be 3 characters or more.` });
        }
    } else {
        res.json({ "OK": false, error: `You have to enter a email, username, and a password. ` });
    }
});

a.post('/remove', async function (req, res) {
    await user.findOne({ _id: req.body.userId }, async function (e, r) {
        if (e) return res.status(500).json({ OK: false, error: e });
        if (!r) return res.status(500).json({ OK: false, error: `Could not authenticate user.` });
        if (r.perms !== "ADMIN") return res.status(500).json({ OK: false, error: `Could not authenticate user.` });
        await shortURL.findOne({ _id: req.body.id }, async function (er, re) {
            if (er) return res.status(500).json({ OK: false, error: e });
            if (!re) return res.status(500).json({ OK: false, error: `Could not find url.` });
            if (re.removed) return res.status(500).json({ OK: false, error: `This url is already removed` });
            await shortURL.updateOne({ _id: req.body.id }, { $set: { removed: true } }).then(() => {
                res.json({ OK: true });
            });
        });
    });
});

a.post('/add', async function (req, res) {
    await user.findOne({ _id: req.body.userId }, async function (e, r) {
        if (e) return res.status(500).json({ OK: false, error: e });
        if (!r) return res.status(500).json({ OK: false, error: `Could not authenticate user.` });
        if (r.perms !== "ADMIN") return res.status(500).json({ OK: false, error: `Could not authenticate user.` });
        await shortURL.findOne({ _id: req.body.id }, async function (er, re) {
            if (er) return res.status(500).json({ OK: false, error: e });
            if (!re) return res.status(500).json({ OK: false, error: `Could not find url.` });
            if (!re.removed) return res.status(500).json({ OK: false, error: `This url is already removed` });
            await shortURL.updateOne({ _id: req.body.id }, { $set: { removed: false } }).then(() => {
                res.json({ OK: true });
            });
        });
    });
});

// Log in with Discord Account

a.get('/callback', async function (req, res) {
    if (!req.query.code) return res.redirect('/');
    let code = req.query.code;

    let data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect,
        'scope': 'identify'
      }
    params = _encode(data)
    await fetch(`https://discordapp.com/api/oauth2/token`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    }).then((r) => r.json()).then(async (body) => {
        let access_token = body.access_token;
        var parse_token = crypto.enc.Utf8.parse(access_token);
        var enc_token = crypto.enc.Base64.stringify(parse_token);

        var decrypt_parse = crypto.enc.Base64.parse(enc_token);
        var decrypt_token = decrypt_parse.toString(crypto.enc.Utf8);

        await fetch("https://discordapp.com/api/v6/users/@me", {
            method: "GET",
            headers: { "Authorization": `Bearer ${access_token}` },
        }).then((r) => r.json()).then(async (body) => {
            // ENC EMAIL:
            var parse_email = crypto.enc.Utf8.parse(body.email);
            var enc_email = crypto.enc.Base64.stringify(parse_email);
            var parse_email2 = crypto.enc.Utf8.parse(body.email.toUpperCase());
            var enc_email2 = crypto.enc.Base64.stringify(parse_email2);
            let r = Math.random(1).toFixed(17).substring(2);
            let findUser = await user.findOne({ userid: body.id });
            if (!findUser) {
            new user({
                user: body.username,
                discriminator: body.discriminator,
                userid: body.id,
                email: enc_email,
                authToken: access_token,
                auth_key: r,
                role: "User",
                officialName: body.username.toUpperCase(),
                officialEmail: enc_email2,
                ifDiscord: true
              }).save().then(() => {
                  res.cookie("token", body.id);
                  res.cookie("userName", body.username);
                  res.cookie('auth_key', r);
                  res.redirect("/account")
              }).catch(err => res.send(err));
            } else {
                user.updateOne({ userid: body.id }, {
                 user: body.username,
                 discriminator: body.discriminator,
                 userid: body.id,
                 email: enc_email,
                 authToken: access_token,
                 auth_key: r,
                 officialName: body.username.toUpperCase(),
                 officialEmail: enc_email2,
                 ifDiscord: true
                }).then(() => {
                 res.cookie('token', body.id);
                 res.cookie('userName', body.username);
                 res.cookie('auth_key', r);
                 res.cookie('auth', findUser._id);
                 res.redirect("/account");
                }).catch(err => res.send(err));
            };
        });

    });
    function _encode(obj) {
        let string = "";

        for (const [key, value] of Object.entries(obj)) {
          if (!value) continue;
          string += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
        return string.substring(1);
      };
});

// Discord Log in URL

a.get('/login/discord', (req, res) => {
  if (config.Url == "http://localhost") return res.redirect(`${config.discord_Url_test}`);
  if (config.Url == "https://www.kaiurl.xyz") return res.redirect(`${config.discord_Url}`);
});

a.post('/passwordReset', async function (req,res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let r = Math.random(1).toFixed(45).substring(2);
    // ENC EMAIL:
    var parse_email = crypto.enc.Utf8.parse(req.body.email.toUpperCase());
    var enc_email = crypto.enc.Base64.stringify(parse_email);
    // DEC EMAIL:
    var email = atob(enc_email);
    let find_user = await user.findOne({ officialEmail: enc_email, officialName: req.body.username.toUpperCase() }) || await user.findOne({ officialEmail: req.body.email.toUpperCase(), officialName: req.body.username.toUpperCase() });
    if (find_user == null) return res.status(404).json({ "OK": false, errorMessage: `Could not authenticate user.` });
    if (find_user.ifDiscord == true) return res.status(404).json({ "OK": false, errorMessage: `Cannot do password resets for Discord accounts.` });
    let a = find_user.sinceLastReset;
    let b = Date.now() + (24 * 60 * 60 * 1000);
    if (!find_user.pass) return res.status(404).json({ "OK": false, errorMessage: `This account is linked with Discord. So you can't reset a password.` });
    if (a < b) return res.status(404).json({ "OK": false, errorMessage: `You can only do a password reset every 24 hours.` });
    await user.updateOne({ _id: find_user._id }, { $set: { passwordReset: true, sinceLastReset: Date.now(), resetId: r, hasReset: true } }).then(() => {
        pReset(req, res, email, find_user.user, r).catch(e => console.log(e));
        res.json({ "OK": true, message: `Sent.` });
    });
});

a.post('/changePassword', async function (req, res) {
    let pId = req.cookies.pResetId;
    // ENC PASS:
    var parse_pass = crypto.enc.Utf8.parse(req.body.new_pass);
    var enc_pass = crypto.enc.Base64.stringify(parse_pass);
    await user.findOne({ resetId: pId }, async (err, re) => {
        if (err) return res.status(500).json({ "OK": false, errorMessage: err });
        if (re == null) return res.status(404).json({ "OK": false, errorMessage: `Could not find user.` });
        await user.updateOne({ _id: re._id }, { $set: { pass: enc_pass, resetId: null, passwordReset: false, auth_key: null } }).then(() => {
            res.clearCookie("pResetId");
            res.json({ "OK": true, errorMessage: null });
        });
    });
});

a.post('/report/:id', async function (req, res) {
    await bRep.findOne({ bugId: req.params.id }, (err, re) => {
        if (err) return res.json({ "OK": false, errorMessage: `Could not find url` });
        if (re == null) return res.status(404).json({ "OK": false, errorMessage: `Couldnt find url` });
        bReport(req, res, 'kaiaf@protonmail.com', `${config.Url}/support/report-bug/reportId/${re.bugId}`);
    });
});

a.get('/:shortid/find', async function (req, res) {
    let info = await shortURL.findOne({ short: req.params.shortid }, { short: 1, full: 1, _id: 0, date: 1, clicks: 1, official: 1, }).exec()
    let Time = timeago.format(info.date, 'en');
   res.json({
       "shortID": info.short,
       "fullURL": info.full,
       "official": info.official,
       "clicks": info.clicks,
       "created": Time
   });
});

a.get('/account', async function (req, res) {
    let username = req.cookies.userName;
    let userid = req.cookies.token;
    if (username && userid) {
        let userInfo = await user.findOne({ userid: req.cookies.token, user: username }, { _id: 0, email: 0, pass: 0, auth_key: 0, resetId: 0, officialEmail: 0 }).exec();
        res.header("Content-Type",'application/json');
        res.send(JSON.stringify(userInfo, null, 2.5));
    } else {
        res.status(404).json({ "auth": false });
    };
});

a.get('/user/:name', async function (req, res) {
    let checkName = await user.findOne({ officialName: req.params.name.toUpperCase() }) || await user.findOne({ nickname: req.params.name });
    if (checkName == null) return res.json({ "OK": false, error: `Could not find user '${req.params.name}'.` });
    if (checkName) return res.json({ "OK": true, error: null });
});

async function pReset(req, res, email, userName, r) {
    res.cookie("pResetId", r);
    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'loudkaiaf@gmail.com',
        pass: process.env.PASS
      }
    });

    var mailOptions = {
      from: 'support@kaiurl.xyz',
      to: email,
      subject: 'KaiURL.xyz Password Reset',
      html: `Hello ${userName},<br><br>Your password reset is here: <a href="${config.Url}/passwordReset?q=${r}">${config.Url}/passwordReset?q=${r}</a>. <br><b>The password reset link will expire after 5 minutes.</b><br><br>If you did not request a password change, please ignore it.`,
      text: `Hello ${userName}, Your password reset is here: ${config.Url}/passwordReset?q=${r}. The password reset link will expire after 5 minutes. If you did not request a password change, please ignore it.`
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        return `${info.response}`
      }
    });
}

async function bReport(req, res, email, data) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'loudkaiaf@gmail.com',
          pass: process.env.PASS
        }
      });

      var mailOptions = {
        from: 'support@kaiurl.xyz',
        to: email,
        subject: 'KaiURL.xyz Bug report',
        html: `A user reported a bug. <a href="${data}">Look at it here</a>`,
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          return `${info.response}`
        }
      });
}

module.exports = a;
