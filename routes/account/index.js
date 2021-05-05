const a = require('express').Router();
const crypto = require('crypto-js');
const { checkName } = require('../nameProtections');
const { checkPerm } = require('../permissions');
const { authJWT } = require('../middleware/auth');
const fetch = require('node-fetch');

const Grid = require('gridfs-stream');
const mongoose = require('mongoose');

const user = require('../db/user');
const userAuth = require('../db/auth');
const userPrivacy = require('../db/privacy/index');
const pvurl = require('../db/pUrl');
const text = require('../db/kaipaste');
const blockedName = require('../db/blockedName');
const apiKey = require('../db/apiKey');

let gfs;
let gfs2;
const conn = mongoose.createConnection(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});
conn.once('open', async function() {
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'Images' });
    gfs = Grid(conn.db, mongoose.mongo);    
    gfs.collection('Images');
    gfs2 = Grid(conn.db, mongoose.mongo);
    gfs2.collection('kaiurlImages');
});

a.get('/', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);
        let findUrl = await pvurl.find({ userID: b.user.userid }, { short: 1, full: 1, _id: 0, date: 1, clicks: 1, official: 1, userID: 1, Domain: 1 }).sort({ date: -1 }).exec()
        let findText = await text.find({ user: b.user._id }, { id: 1, title: 1, user: 1, userID: 1, description: 1, date: 1, _id: 0, removed: 1 }).sort({ date: -1 }).exec();
        let checkBlockName = await blockedName.find({}, { name: 1, _id: 0 });
        
        res.render('./account/index', { u: findUser, theme: theme, crypto: crypto, p: findUrl, text: findText, bName: checkBlockName });
    });
});

a.get('/privacy', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);
        let findPrivacy = await userPrivacy.findOne({ user: findUser._id });
        if (!findPrivacy) findPrivacy = null;
        res.render('./account/privacy/index', { theme: theme, u: findUser, privacy: findPrivacy });
    });
});

a.get('/dashboard', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);
        let checkApiKey = await apiKey.findOne({ user: b.user.userid });
        
        res.render('./account/dashboard', { theme: theme, u: findUser, key: checkApiKey });
    });
});

a.get('/files', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);
        await gfs.files.find({user: findUser._id}).sort({ uploadDate: -1 }).toArray((e, files) => {
            let a = [];
            if (!files || files.length === 0) a = null;
            if (files || files.length > 0) {
                files.map(f => {
                    a.push(f);
                });
            res.render('./account/img', { theme: theme, u: findUser, img: a });
        }});
    });
});

a.post('/files/:id/remove', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let error = { message: `Could not authenticate request`, status: 401 };
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error, code: 12389 });
        if (b.OK == false) return res.status(401).json({ OK: false, error, code: 18911 });
        await gfs.files.findOne({ filename: req.params.id, user: findUser._id }, async function (e, r) {
            if (e) return res.status(500).json({ OK: false, erorr: e });
            if (!r) return res.status(500).json({ OK: false, error: { message: `Could not find file`, status: 500 } });
            await gfs.files.updateOne({ _id: r._id }, { $set: { removed: true } }).then(() => {
                res.redirect('/account/files');
            });
        });
    });
});

module.exports = a;