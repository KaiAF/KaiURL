const a = require('express').Router();
const path = require('path');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const user = require('../db/user');
const { error404 } = require('../errorPage');

var url = process.env.MONGODB;

const storage = new gridFS({ url, options: {useUnifiedTopology: true}, file: (req, file) => {
        if (file.mimetype === "image/jpeg" || file.mimetype === 'image/png') {
            return {
                bucketName: 'kaiurlImages',
                filename: `Image.png`
            };
        } else {
            return null;
        }
}});
const Filter = function(req, file, cb) {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error(`Wrong File Type.`), false);
    }
}

const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 5 }, fileFilter: Filter});

let gfs;
let gridFSBucket;
const conn = mongoose.createConnection(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
conn.once('open', async function() {
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'kaiurlImages' });
    gfs = Grid(conn.db, mongoose.mongo);    
    gfs.collection('kaiurlImages');
    console.log('Got Avatars')
});

a.post('/', upload.single('Image'), async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let Image = await gfs.files.findOne({ _id: req.file.id });
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false || b.OK == false && b.code == 12671)  {
            await gfs.db.collection('kaiurlImages.chunks').deleteMany({ files_id: Image._id }).then(async () => {
                await gfs.files.deleteOne({ _id: Image._id }).then(() => {
                    res.status(401).render('./error/index', { u: null, theme: theme, errorMessage: `Could not authenticate request.` });
                }).catch(e => { res.send(e) });
            });
        }
        await gfs.files.updateOne({ _id: Image._id }, { $set: { filename: `${findUser.userid}.png`, user: findUser.userid } }).then(() => { res.redirect('/account/edit') });
    });
});

a.get('/delete', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);

        res.json({ OK: true });
    });
});

a.post('/delete', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (b.OK == false) return res.redirect(`/login?redirect=${req.originalUrl}`);
        let Image = await gfs.files.findOne({ filename: `${findUser.userid}.png`, user: findUser.userid });
        if (!Image) return res.status(404).render('./error/index', { theme: theme, u:findUser, errorMessage: `Could not find avatar` });
        await gfs.db.collection('kaiurlImages.chunks').deleteMany({ files_id: Image._id }).then(async () => {
            await gfs.files.deleteOne({ _id: Image._id }).then(() => {
                res.redirect('/account/edit');
            }).catch(e => { res.send(e) });
        });
    });
});

a.get('/:fileName', async function (req, res) {
    let name = req.params.fileName;
    await gfs.files.findOne({ filename: name }, (err, file) => {
        if (err) return console.log(err);
        if (!file || file.length === 0) return error404(req, res);
        const readstream = gridFSBucket.openDownloadStream(file._id);
        return readstream.pipe(res);
    });
});


module.exports =  a;