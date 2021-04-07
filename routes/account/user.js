const a = require('express').Router();
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');

const blockedName = require('../db/blockedName');
const user = require('../db/user');
const pvurl = require('../db/pUrl');

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

a.get('/:name', async function (req, res) {
    let userid = req.cookies.token;
    let id = req.cookies.auth;
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!userid) userid = null;
    if (!id) id = null;
    let checkLog = await user.findOne({ userid: userid, _id: id });
    if (!checkLog) checkLog = null;
    let findUser = await user.findOne({ officialName: req.params.name.toUpperCase() }) || await user.findOne({ userid: req.params.name });
    if (!findUser) return res.status(404).render('./error/index', { theme: theme, errorMessage: `Could not find user.`, u: checkLog });

    let countUserName = await user.countDocuments({ officialName: req.params.name.toUpperCase() });

    let checkBlockedName = await blockedName.findOne({ title: 'list' });
    if (!checkBlockedName) checkBlockedName = null;

    let user_urls = await pvurl.find({ userID: findUser.userid });
    let Image = await gfs.files.findOne({ filename: `${findUser.userid}-${findUser._id}.png` }) || await gfs.files.findOne({ filename: `${findUser.userid}.png`, user: findUser.userid });
    if (!Image) Image = null;

    if (countUserName > 1 && findUser.perms == null) {
        let findUser = await user.find({ officialName: req.params.name.toUpperCase() });
        return res.render('./account/pubProfile2', { u: checkLog, theme: theme, number: countUserName, image: Image, user: findUser });
    } else {
        if (checkLog && checkLog.userid === findUser.userid) return res.render('./account/pubProfile', { u: checkLog, theme: theme, user: findUser, Name: checkBlockedName, uUrl: user_urls, image: Image });
        res.render('./account/pubProfile', { theme: theme, u: checkLog, user: findUser, Name: checkBlockedName, uUrl: user_urls, image: Image });
    };
});

module.exports = a;