const a = require('express').Router();
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

const blockedName = require('../db/blockedName');
const user = require('../db/user');
const userPrivacy = require('../db/privacy/index');
const pvurl = require('../db/pUrl');
const { checkPerm } = require('../permissions');
const { error404 } = require('../errorPage');

const conn = mongoose.createConnection(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});
conn.once('open', async function() {
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'Images' });
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('kaiurlImages');
});

// This is for actual user that isn't admin!
a.get('/:account', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""

    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);

        let USER = await user.findOne({ officialName: req.params.account.toUpperCase() }) || await user.findOne({ userid: req.params.account });
        if (!USER) return error404(req, res);
        let countUserName = await user.countDocuments({ officialName: req.params.account.toUpperCase() });
        let checkBlockedName = await blockedName.findOne({ title: 'list' });
        if (!checkBlockedName) checkBlockedName = null;

        let userUrls = await pvurl.find({ userID: USER.userid });
        let Image = await gfs.files.findOne({ filename: `${USER.userid}.png`, user: USER.userid });
        if (!Image) Image = null;
        let findPrivacy = await userPrivacy.findOne({ user: USER._id });
        if (!findPrivacy) findPrivacy = null;

        if (countUserName > 1 && USER.perms == null) {
            res.render('./account/pubProfile2', { u: b.user, theme: theme, number: countUserName, image: Image, user: USER });
        } else {
            if (b.user && await checkPerm(b.user.userid) == "ADMIN") return res.render('./account/pubProfile', { theme: theme, u: b.user, user: USER, Name: checkBlockedName, uUrl: userUrls, image: Image, privacy: findPrivacy, admin: true });
            res.render('./account/pubProfile', { theme: theme, u: b.user, user: USER, Name: checkBlockedName, uUrl: userUrls, image: Image, privacy: findPrivacy, admin: false });
        }
    });
});

module.exports = a;