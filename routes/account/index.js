const a = require('express').Router();
const crypto = require('crypto-js');
const { checkName } = require('../nameProtections');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');

const user = require('../db/user');
const pvurl = require('../db/pUrl');
const text = require('../db/kaipaste');
const blockedName = require('../db/blockedName');

let gfs;
var conn = mongoose.connection;
    conn.once('open', async function() {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('kaiurlImages');
});

a.get('/', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (userid && username) {
        let check_user = await user.findOne({ userid: userid, user: username });
        let find_blockName = await blockedName.find({}, { name: 1, _id: 0 });
        let find_pvurl = await pvurl.find({ userID: userid }, { short: 1, full: 1, _id: 0, date: 1, clicks: 1, official: 1, userID: 1, Domain: 1 }).exec()
        let find_text = await text.find({ userID: userid }, { id: 1, title: 1, user: 1, userID: 1, description: 1, date: 1, _id: 0, removed: 1 }).exec();
        if (check_user == null) {
            res.clearCookie("token");
            res.clearCookie("userName");
            res.redirect('/');
        } else {
            res.render('./account/index', { u: check_user, log: true, theme: theme, crypto: crypto, p: find_pvurl, text: find_text, bName: find_blockName });
        }
        } else {
            res.redirect('/login');
        };
});

a.get('/edit', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (userid && username) {
        let check_user = await user.findOne({ userid: userid, user: username });
        if (check_user == null) {
            res.clearCookie("token");
            res.clearCookie("userName");
            res.redirect('/');
        } else {
            let image = await gfs.files.findOne({ filename: `${check_user.userid}-${check_user._id}.png` });
            res.render('./account/edit', { u: check_user, log: true, theme: theme, image: image, errorMessage: null });
        };
    } else {
        res.redirect('/login');
    };
});

a.post('/edit', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (userid && username) {
        let check_user = await user.findOne({ userid: userid, user: username });
        if (check_user == null) {
            res.clearCookie("token");
            res.clearCookie("userName");
            res.redirect('/');
        } else {
            let image = await gfs.files.findOne({ filename: `${check_user.userid}-${check_user._id}.png` });
            if (req.query.type === "nickname") {
                changeUsername(req, res, req.body.nickname, userid, check_user);
            } else if (req.query.type === "desc") {
                desc(req, res, req.body.desc);
            } else if (req.query.type === "twitter") {
                linkedAcc(req, res, req.body.twitter, 'twitter')
            } else if (req.query.type === "youtube") {
                linkedAcc(req, res, req.body.youtube, 'youtube')
            } else if (req.query.type === "discord") {
                if (!req.body.discord) return linkedAcc(req, res, " ", 'discord');
                if (req.body.discord.includes("#")) {
                    linkedAcc(req, res, req.body.discord, 'discord')
                } else {
                    return res.json({ "OK": false, error: `Discord name invalid. ` })
                }
            } else if (req.query.type === "glimesh") {
                linkedAcc(req, res, req.body.glimesh, 'glimesh')
            }
        };
    } else {
        res.json({ "OK": false, error: `Could not authenticate user.` })
    };
});

async function changeUsername(req, res, nickName, userid, AU) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    // This checks if the user is trying to change their nickname to an already existing nickname.
    let check_nickName = await user.findOne({ nickname: nickName });
    // This checks if the user is trying to change their nickname to an already existing username.
    let check_userName = await user.findOne({ user: nickName });

    let image = await gfs.files.findOne({ filename: `${AU.userid}-${AU._id}.png` });
    
    if (check_nickName) return res.json({ "OK": false, error: `Nickname already exist. ` });
    // Let's see if the user is trying to reset their nickname to their username. If not, it would just provide an error message. 
    if (check_userName) {
        if (check_userName.userid == userid) {
            if (check_userName.user == nickName) {
               return await user.updateOne({ _id: AU._id }, { $set: { nickname: null } }).then(() => {
                return res.json({
                    "OK": true,
                    error: null
                });
            });
            }
        } else { return res.json({ "OK": false, error: `Username already exist. ` }) };
    }
    // Let's add the protections for the username.
    if (nickName.length < 3) return res.json({ "OK": false, error: `Nickname has to be 3 or more characters. ` });
    if (nickName.length > 16) return res.json({ "OK": false, error: `Nickname cannot be more than 16 characters. ` });
    // Let's see if the nickname is a blocked one.
    let checkname = nickName.toUpperCase();
    await checkName(req, res, checkname).then(async (r) => {
        if (r === true || r === undefined) return res.json({ "OK": false, error: `Username could not be set. ` }) //res.render('./account/edit', { u: AU, log: true, theme: theme, image: image, errorMessage: `Username could not be set.` });
        if (r === null) return await user.updateOne({ _id: AU._id }, { $set: { nickname: nickName } }).then(() => { res.json({ "OK": true, error: null }) });
    });
};

async function desc(req, res, desc) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!desc) desc = null;
    await user.updateOne({ _id: req.cookies.auth }, { $set: { description: desc } }).then(() => {
        res.json({
            "OK": true,
            error: null
        });
    });
};

async function linkedAcc(req, res, account, type) {
    let params;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let acc = account
    if (!acc || acc.indexOf(' ') >= 0) acc = null
    if (type == "twitter") params = { twitter: acc };
    if (type == "youtube") params = { youtube: acc };
    if (type == "discord") params = { discord: acc };
    if (type == "glimesh") params = { glimesh: acc };
    await user.updateOne({ userid: req.cookies.token }, { $set: params }).then(() => {
        return res.json({
            "OK": true,
            error: null
        })
    });
}

a.use(function (req, res, next) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    res.status(404).render('./error/index', {
        errorMessage: `This page was not found.`,
        u: null, log: false, theme: theme
    });
});

module.exports = a;