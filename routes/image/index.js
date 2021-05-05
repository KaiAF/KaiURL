const a = require('express').Router();
const path = require('path');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const { checkPerm } = require('../permissions');

require('dotenv').config();

var url = process.env.MONGODB;

const user = require('../db/user');
const apiKey = require('../db/apiKey');
const fetch = require('node-fetch');
const config = require('../config.json');
const { error404 } = require('../errorPage');

async function checkfName(req, file) {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/png') {
        return `${file.originalname.replace('.png', '')}.png`;;
    } else if (file.mimetype === "text/plain") {
        return `${file.originalname.replace('.txt', '')}.txt`;;
    } else if (file.mimetype === "image/gif") {
        return `${file.originalname.replace('.gif', '')}.gif`;;
    }
}

const storage = new gridFS({ url, options: {useUnifiedTopology: true}, file: (req, file) => {    
    let name = checkfName(req, file).then((n) => {
        return {
            bucketName: 'Images',
            filename: `${n}`
        };
    });
    return name;
}});

async function Filter(req, file, cb) {
    let key = req.query.apiKey;
    if (!key) return cb(new Error(`Could not find API Key.`));
    if (!file) return cb(new Error(`Could not find file.`));
    await apiKey.findOne({ key: key }, async function (err, re) {
        if (err) return cb(new Error(err));
        if (re == null) return cb(new Error(`Could not find API Key.`));
        if (file.mimetype == "image/png" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else if (file.mimetype == "image/gif") {
            cb(null, true);
        } else if (file.mimetype == "text/plain") {
            cb(null, true);
        } else {
            cb(new Error(`'${file.mimetype}' is an Invalid File type.`));
        }
    });
}

const upload = multer({ storage: storage, fileFilter: Filter });

let gfs;
let gridFSBucket;
const conn = mongoose.createConnection(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});
conn.once('open', async function() {
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'Images' });
    gfs = Grid(conn.db, mongoose.mongo);    
    gfs.collection('Images');
});

a.get('/', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        res.render('./image/index', { theme: theme, u: findUser });
    });
});

a.get('/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return error404(req, res);
        if (await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res);
        await gfs.files.find({}).sort({ uploadDate: -1 }).toArray((e, files) => {
            let a = [];
            if (!files || files.length == 0) a = null;
            if (files || files.length > 0) {
                files.map(f => { a.push(f) });
            };
            res.render('./image/all', { theme: theme, u: findUser, img: a });
        });
    });
});

a.get('/:id/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return error404(req, res);
        if (await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res);
        let Image = await gfs.files.findOne({ filename: req.params.id });
        if (!Image) return res.status(404).send('Could not find file');

        res.render('./image/admin', { theme: theme, u: findUser, image: Image });
    });
});

a.post('/:id/delete', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser || await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res)
        let findImages = await gfs.files.findOne({ md5: req.params.id });
        if (!findImages) return res.status(404).json({ OK: false, error: { message: `Could not find file`, status: 404 } });
        await gfs.files.updateOne({ md5: req.params.id }, { $set: { removed: true } }).then(() => { res.redirect(`/i/${findImages.filename}/admin`); });
    });
});

a.post('/:id/delete/admin', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser || await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res)
        let findImages = await gfs.files.findOne({ md5: req.params.id });
        if (!findImages) return res.status(404).json({ OK: false, error: { message: `Could not find file`, status: 404 } });
        await gfs.db.collection('Images.chunks').deleteMany({ files_id: findImages._id }).then(async () => {
            await gfs.files.deleteOne({ _id: findImages._id }).then(() => {
                res.redirect('/i/admin');
            }).catch(e => { res.status(500).send(e) });
        }).catch(e => { res.status(500).send(e) });
    });
});

a.post('/:id/add', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser || await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res)
        let findImages = await gfs.files.findOne({ md5: req.params.id });
        if (!findImages) return res.status(404).json({ OK: false, error: { message: `Could not find file`, status: 404 } });
        await gfs.files.updateOne({ md5: req.params.id }, { $set: { removed: false } }).then(() => { res.redirect(`/i/${findImages.filename}/admin`); });
    });
});

a.post('/', upload.single('File'), async function (req, res) {
    if (!req.file) return res.status(500).json({ OK: false, erorr: 'Could not find file.' });
    let checkKey = await apiKey.findOne({ key: req.query.apiKey });
    if (!checkKey) return res.status(500).json({ OK: false, error: `You need to have an API key` });
    let checkUser = await user.findOne({ userid: checkKey.user });
    if (!checkUser) return res.status(403).json({ OK: false, error: `You need to be logged in.` });
    await gfs.files.findOne({ _id: req.file.id }, async function (e, r){
        if (e) return res.status(500).json({ OK: false, error: e });
        if (r == null) return res.status(500).json({ OK: false, error: 'Could not find File.' });
        if (r) {
            await gfs.files.updateOne({ _id: r._id }, { $set: { user: checkUser._id } }).then(() => {
                res.json({ OK: true, urlPath: `${r.filename}` });
            });
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
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        await gfs.files.findOne({ filename: req.params.id }, async (e, f) => {
            if (!f) return error404(req, res);
            if (findUser) {
                if (f.removed && await checkPerm(findUser.userid) == "ADMIN") return res.redirect('/i/' + f.filename + '/admin');
                if (f.removed) return error404(req, res);
            } else {
                if (f.removed) return error404(req, res);
            }
            const readstream = gridFSBucket.openDownloadStream(f._id);
            return readstream.pipe(res);
        });
    });
});

a.get('/:id/embed', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get', headers: { 'user-agent': "KaiURL.xyz Auth" } }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser || await checkPerm(findUser.userid) !== "ADMIN") return error404(req, res);
        await gfs.files.findOne({ filename: req.params.id }, (e, f) => {
            if (!f) return error404(req, res);
            const readstream = gridFSBucket.openDownloadStream(f._id);
            return readstream.pipe(res);
        });
    });
});


module.exports =  a;