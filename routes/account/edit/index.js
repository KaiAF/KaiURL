const a = require('express').Router();
const crypto = require('crypto-js');
const { checkName } = require('../../nameProtections');
const { checkPerm } = require('../../permissions');
const { authJWT } = require('../../middleware/auth');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const atob = require('atob');
const btoa = require('btoa');
const fetch = require('node-fetch');

const user = require('../../db/user');
const userDiscord = require('../../db/userDiscord');
const userAuth = require('../../db/auth');
const pvurl = require('../../db/pUrl');
const text = require('../../db/kaipaste');
const blockedName = require('../../db/blockedName');
const apiKey = require('../../db/apiKey');
const { error404 } = require('../../errorPage');

let gfs;
let gfs2;
let gridFSBucket;
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
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);
        let discord = await userDiscord.findOne({ userId: findUser.discord });
        let image = await gfs2.files.findOne({ filename: `${findUser.userid}.png` });
        res.render('./account/edit', { u: findUser, theme: theme, image: image, userDiscord: discord });
    });
});

a.post('/', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.json({ OK: false, error: 'Could not authenticate request. Try refreshing.' })
        if (b.OK == false) return res.json({ OK: false, error: 'Could not authenticate request. Try refreshing.' })
        let {type} = req.query;
        let {nickname} = req.body;

        if (type == "nickname") {
            changeUsername(req, res, nickname, findUser.userid);
        } else if (type == 'desc') {
            desc(req, res, req.body.desc, findUser._id); 
        }
    });
});

a.get('/:id', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return error404(req, res);
        if (b.OK == false) return error404(req, res);

        if (await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res);
        await user.findOne({ userid: req.params.id }, async function (e, r) {
            if (!r) return res.status(404).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not find user.` });
            let uPerms = await checkPerm(findUser.userid)
            let userPerms = await checkPerm(r.userid)
            res.render('./account/adminEdit', { theme: theme, u: findUser, user: r, dEmail: atob, userPerm: userPerms, uPerm: uPerms });
        });
    });
});

a.post('/:id/change', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    let error = { message: `Could not authenticate request. Try refreshing.`, status: 401 }
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error, code: 1891 });
        if (b.OK == false) return res.status(401).json({ OK: false, error, code: 12315 });
        let User = await user.findOne({ userid: req.params.id });
        if (!User) return res.status(404).json({ OK: false, error: { message: `Could not find user.`, status: 404 } });
        if (await checkPerm(findUser.userid) !== "ADMIN") return res.status(401).json({ OK: false, error, code: 8917 });
        let {option, changeUsername, changeEmail, changePerms, remove} = req.body;
        
        if (option.toUpperCase() == "USERNAME") {
        if (!req.body.changeUsername) return res.status(404).json({ OK: false, error: `You need to fill in the form.` });
        await user.findOne({ officialName: changeUsername.toUpperCase() }, async function (e, r) {
            if (e) return res.status(500).json({ OK: false, error: e });
            if (r) return res.json({ OK: false, error: `Username already exist!` });
            await user.updateOne({ _id: User._id }, { $set: { officialName: req.body.changeUsername.toUpperCase(), user: changeUsername } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        }); 
        } else if (option.toUpperCase() == "EMAIL") {
        if (!changeEmail) return res.status(404).json({ OK: false, error: `You need to fill in the form.` });
        await user.findOne({ officialEmail: btoa(changeEmail.toUpperCase()) }, async function (e, r) {
            if (e) return res.status(500).json({ OK: false, error: e });
            if (r) return res.json({ OK: false, error: `Email already exist!` });
            await user.updateOne({ _id: User._id }, { $set: { officialEmail: btoa(changeEmail.toUpperCase()), email: btoa(changeEmail) } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        });
        } else if (option.toUpperCase() == "PERMS") {
        if (findUser.perms !== "OWNER") return res.json({ OK: false, error: 'You do not have access to this!' });
        if (changePerms.toUpperCase() == "MEMBER") return changeMember();
        if (changePerms.toUpperCase() == "BUG-HUNTER") return changeBugHunter();
        if (changePerms.toUpperCase() == "MOD") return changeMod();
        if (changePerms.toUpperCase() == "ADMIN") return changeAdmin();
        if (changePerms.toUpperCase() == "VERIFIED") return changeVerified();

        async function changeMember() {
            await user.updateOne({ _id: User._id }, { $set: { perms: null } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        };
        async function changeBugHunter() {
            await user.updateOne({ _id: User._id }, { $set: { perms: "BUG-HUNTER" } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        }
        async function changeMod() {
            await user.updateOne({ _id: User._id }, { $set: { perms: "MOD" } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        }
        async function changeAdmin() {
            await user.updateOne({ _id: User._id }, { $set: { perms: "ADMIN" } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        }
        async function changeVerified() {
            await user.updateOne({ _id: User._id }, { $set: { perms: "VERIFIED" } }).then(() => {
                res.redirect(`/account/edit/${User.userid}`);
            });
        };
        } else if (option.toUpperCase() == "REMOVE") {
            if (findUser.perms !== "OWNER") return res.json({ OK: false, error: `You do not have access to this.` });
            if (!remove) return res.status(404).json({ OK: false, error: `You need to fill in the form.` });
            await user.findOne({ userid: req.params.id }, async function (e, r) {
                if (e) return res.status(500).json({ OK: false, error: e });
                if (r.removed) return res.json({ OK: false, error: 'Account is already removed!' });
                await user.updateOne({ _id: User._id }, { $set: { removed: true, reason: remove } }).then(() => {
                    res.redirect(`/account/edit/${User.userid}`);
                });
            });
        } else if (option.toUpperCase() == "ADD") {
            if (findUser.perms !== "OWNER") return res.json({ OK: false, error: `You do not have access to this.` });
            if (!remove) return res.status(404).json({ OK: false, error: `You need to fill in the form.` });
            await user.findOne({ userid: req.params.id }, async function (e, r) {
                if (e) return res.status(500).json({ OK: false, error: e });
                if (r.removed == false) return res.json({ OK: false, error: 'Account is already added!' });
                await user.updateOne({ _id: User._id }, { $set: { removed: false, reason: remove } }).then(() => {
                    res.redirect(`/account/edit/${User.userid}`);
                });
            });
        }
    });
});

async function changeUsername(req, res, nickName, userid) {
    let name = nickName.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
    if (name.length < 3) return res.json({ "OK": false, error: `Nickname has to be 3 or more characters. ` });
    if (name.length > 16) return res.json({ "OK": false, error: `Nickname cannot be more than 16 characters. ` });
    await user.findOne({ userid: userid }, async function (e, r) {
        if (r) {
            await user.findOne({ officialName: name.toUpperCase() }, async function (e, re) {
                if (re && re.userid !== userid) return res.json({ OK: false, error: 'This nickname already exist' });
                await checkName(name.toUpperCase()).then(async (a) => {
                    if (a) return res.json({ "OK": false, error: `Username could not be set.` });
                    if (!a) return await user.updateOne({ _id: r._id }, { $set: { nickname: name } }).then(() => { res.json({ "OK": true, error: null }) });
                });
            });
        } else {
            return res.json({ OK: false, error: 'Could not find user.' });
        }
    });
};

async function desc(req, res, desc, id) {
    if (!desc) desc = null;
    await user.updateOne({ _id: id }, { $set: { description: desc } }).then(() => { res.json({ OK: true }) });
};

async function linkedAcc(req, res, account, type) {
    let params;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let acc = account
    if (!acc || acc.indexOf(' ') >= 0) acc = null
    if (type == "twitter") params = { twitter: acc };
    if (type == "youtube") params = { youtube: acc };
    if (type == "glimesh") params = { glimesh: acc };
    await user.updateOne({ userid: req.cookies.token }, { $set: params }).then(() => {
        return res.json({
            "OK": true,
            error: null
        })
    });
}

module.exports = a;