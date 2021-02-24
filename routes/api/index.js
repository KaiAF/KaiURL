const a = require('express').Router();
const crypto = require('crypto-js');
const SHA256 = require('crypto-js/sha256');
const timeago = require('timeago.js');
const { Client } = require('discord.js');
const btoa = require('btoa');
const path = require('path');
const client = new Client();
const env = require('dotenv').config();
const fetch = require('node-fetch');
const { checkName } = require('../nameProtections');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const redirect = "http://www.kaiurl.xyz/api/callback";

const user = require('../db/user');
const shortURL = require('../db/shortURL');

// Log in with KaiURL.xyz Account

a.post('/login', async function (req, res) {
    let username = req.body.username;
    let pass = req.body.password;

    let theme = req.cookies.Theme;
    if (!theme) theme = null;


    if (username && pass) {
        // ENC PASS:
        var parse_pass = crypto.enc.Utf8.parse(pass);
        var enc_pass = crypto.enc.Base64.stringify(parse_pass);
        
        let validate_user = await user.findOne({ user: username, pass: enc_pass });
        
        if (validate_user == null) return res.json({ "OK": false, error: `Could not find user.` });

        if (validate_user) {
            let r = Math.random(1).toFixed(17).substring(2);
            await user.updateOne({ _id: validate_user._id }, { $set: { auth_key: r } }).then(() => {
                res.cookie('token', validate_user.userid);
                res.cookie('userName', validate_user.user);
                res.cookie('auth_key', r);
                res.json({ 'OK': true, error: null });
            });
        };
    } else {
        res.json({ "OK": false, error: `You need to enter a username and password.` })
    }
});

a.post('/register', async function (req, res) {
    let username = req.body.username;
    let pass = req.body.password;
    let email = req.body.email;

    let theme = req.cookies.Theme;
    if (!theme) theme = null;

    if (email && pass && username) {
        // Username length has to be 3 characters or more.
        if (username.length > 2) {
        // Check if the name is blocked.
        let checkname = username.toUpperCase();
        let check_block = await checkName(req, res, checkname);
        if (check_block === true || check_block === undefined) return res.json({ "OK": false, error: `Could not set username. ` });
        // ENC PASS:
        var parse_pass = crypto.enc.Utf8.parse(pass);
        var enc_pass = crypto.enc.Base64.stringify(parse_pass);
        // ENC EMAIL:
        var parse_email = crypto.enc.Utf8.parse(email);
        var enc_email = crypto.enc.Base64.stringify(parse_email);

        let random_id = Math.random(1).toFixed(20).substring(2);

        let check_username = await user.findOne({ user: username });
        let check_email = await user.findOne({ email: enc_email });
        let check_email_dec = await user.findOne({ email: email });
        let check_id = await user.findOne({ userid: random_id });

        if (check_username) return res.json({ "OK": false, error: `Username already exist. ` });
        if (check_email) return res.json({ "OK": false, error: `Email already exist. ` });
        if (check_email_dec) return res.json({ "OK": false, error: `Email already exist. ` });
        if (check_id) return res.json({ "OK": false, error: `userID already exist. Please try again. ` });

        new user({
            userid: random_id,
            user: username,
            pass: enc_pass,
            email: enc_email,
            joinDate: Date.now()
        }).save().then(() => {
            res.cookie("token", random_id);
            res.cookie('userName', username);
            res.json({
                "OK": true
            })
        })
        } else {
            res.json({ "OK": false, error: `Username has to be 3 characters or more. ` });
        }
    } else {
        res.json({ "OK": false, error: `You have to enter a email, username, and a password. ` });
    }
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
           let r = Math.random(1).toFixed(17).substring(2);
           let findUser = await user.findOne({ userid: body.id });
           if (!findUser) {
           new user({
               user: body.username,
               discriminator: body.discriminator,
               userid: body.id,
               email: body.email,
               authToken: access_token,
               auth_key: r
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
                email: body.email,
                authToken: access_token,
                auth_key: r
               }).then(() => {
                res.cookie('token', body.id);
                res.cookie('userName', body.username);
                res.cookie('auth_key', r);
                res.redirect("/account")
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
    // res.redirect('https://discord.com/api/oauth2/authorize?client_id=798632117981413397&redirect_uri=http%3A%2F%2Flocalhost%2Fapi%2Fcallback&response_type=code&scope=identify%20email%20connections');
    res.redirect('https://discord.com/api/oauth2/authorize?client_id=797253825336573975&redirect_uri=http%3A%2F%2Fwww.kaiurl.xyz%2Fapi%2Fcallback&response_type=code&scope=identify%20email%20connections');
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

a.post('/change-theme', async function (req, res) {
    let theme = req.cookies.Theme;
    let page = req.query.page;
    if (theme) {
        if (theme == "dark") {
            res.cookie("Theme", "light", { maxAge: 3.154e+10 });
            res.redirect(page)
        } else {
            res.cookie("Theme", "dark", { maxAge: 3.154e+10 });
            res.redirect(page)
        }
    } else {
        res.cookie("Theme", "dark", { maxAge: 3.154e+10 });
        res.redirect(page)
    };
});

a.get('/account', async function (req, res) {
    let username = req.cookies.userName;
    let userid = req.cookies.token;
    if (username && userid) {
        let userInfo = await user.findOne({ userid: req.cookies.token, user: username }, { _id: 0, email: 0, pass: 0, auth_key: 0 }).exec();
        res.send(userInfo)
    } else {
        res.json({ "auth": false });
    };
});

module.exports = a;