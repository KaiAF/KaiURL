require('dotenv').config();
const a = require('express').Router();
const time = require('timeago.js');
const fetch = require('node-fetch');
const crypto = require('crypto-js');
const atob = require('atob');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const {sub, add} = require('../time');

const user = require('../db/user');
const config = require('../config.json');

let _url;
if (config.Url == true) _url = "https://www.kaiurl.xyz";
if (config.Url == false) _url = "http://localhost";
const _URL = _url

a.get('/', async function (req,res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let {q} = req.query;
        if (!q) return res.render('./passwordReset/index', { theme: theme, u: findUser });
        await user.findOne({ resetId: q }, async function (e, r) {
            if (!r) return res.redirect('/passwordReset');
            if (r.sinceLastReset < sub(5)) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Password reset link expired.` });
            res.render('./passwordReset/pReset', { u: findUser, theme: theme });
        });
    });
});

a.post('/', async function (req,res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let {email, username} = req.body;
        let r = Math.random(1).toFixed(45).substring(2);

        var parse_email = crypto.enc.Utf8.parse(email.toUpperCase());
        var enc_email = crypto.enc.Base64.stringify(parse_email);
        var dEmail = atob(enc_email);
        let checkUser = await user.findOne({ officialEmail: enc_email, officialName: username.toUpperCase() });
        if (!checkUser) return res.status(401).json({ OK: false, error: { message: `Could not authenticate user.`, status: 401 }, code: 8911 });
        if (checkUser.ifDiscord == true) return res.status(401).json({ OK: false, error: { message: `You can't reset the password for Discord accounts.`, status: 401 } });
        if (checkUser.sinceLastReset < add(1440)) return res.status(401).json({ OK: false, error: { message: `You can only reset your password every 24 hours.`, status: 401 } });
        await user.updateOne({ _id: checkUser._id }, { $set: { passwordReset: true, sinceLastReset: Date.now(), resetId: r, hasReset: true } }).then(() => {
            pReset(req, res, dEmail, checkUser.user, r).catch(e => console.log(e));
            res.json({ "OK": true });
        });
    });
});

a.post('/change', async function (req, res) {
    let {theme, auth, pResetId} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        var parse_pass = crypto.enc.Utf8.parse(req.body.new_pass);
        var enc_pass = crypto.enc.Base64.stringify(parse_pass);
        await user.findOne({ resetId: pResetId }, async function (e, r) {
            if (!r) return res.status(500).json({ OK: false, error: { message: `Could not find reset Id`, status: 500 } });
            
            await user.updateOne({ _id: r._id }, { $set: { pass: enc_pass, auth_key: null } }).then(async () => {
                await user.updateOne({ _id: r._id }, { $unset: { resetId: null, passwordReset: null } }).then(() => { res.clearCookie('pResetId'); res.json({ OK: true }) });
            });
        });
    });
});

async function pReset(req, res, email, userName, r) {
    res.cookie("pResetId", r);
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport(smtpTransport({
        host:'webserver3.pebblehost.com',
        secureConnection: false,
        tls: {
          rejectUnauthorized: false
        },
        port: 465,
        auth: {
            user: 'kai@kaiaf.host',
            pass: process.env.PASS,
      }
    }));
    
    var mailOptions = {
      from: 'kai@kaiaf.host',
      to: email,
      subject: 'KaiURL.xyz Password Reset',
      html: `Hello ${userName},<br><br>Your password reset is here: <a href="${_URL}/passwordReset?q=${r}">${_URL}/passwordReset?q=${r}</a>. <br><b>The password reset link will expire after 5 minutes.</b><br><br>If you did not request a password change, please ignore it.`,
      text: `Hello ${userName}, Your password reset is here: ${_URL}/passwordReset?q=${r}. The password reset link will expire after 5 minutes. If you did not request a password change, please ignore it.`
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