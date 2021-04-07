const a = require('express').Router();
const path = require('path');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
require('dotenv').config();

const user = require('../db/user');

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

a.get('/', (req, res) => {
    res.json({
        "OK": true
    });
});

a.post('/', upload.single('Image'), async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!req.cookies.auth) return res.redirect('/login?redirect=/account/edit');
    if (!req.cookies.auth_key) return res.redirect('/login?redirect=/account/edit');
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser) return res.status(500).render('./error/index', { theme: theme, errorMessage: `Could not find user!`, u: null });
    if (!req.file) return res.status(500).render('./error/index', { theme: theme, errorMessage: `Could not find file!`, u: checkUser });
    await gfs.files.findOne({ _id: req.file.id }, async function (e, r) {
        if (e) return res.status(500).render('./error/index', { theme: theme, errorMessage: e, u: checkUser });
        if (r == null) res.redirect('/account/edit');
        if (r) {
            await gfs.files.updateOne({ _id: r._id }, { $set: { filename: `${checkUser.userid}.png`, user: checkUser.userid } }).then(() => {
                res.redirect('/account/edit');
            });
        };
    });
});

a.post('/delete', async function (req, res) {
    if (req.cookies.token && req.cookies.auth) {
        let Image = await gfs.files.findOne({ filename: `${req.cookies.token}.png`, user: req.cookies.token }) || await gfs.files.findOne({ filename: `${req.cookies.token}-${req.cookies.auth}.png` });
        if (!Image) return res.status(404).send('Could not find file!');
        await gfs.db.collection('kaiurlImages.chunks').deleteMany({ files_id: Image._id }).then(async () => {
            await gfs.files.deleteOne({ _id: Image._id }).then(() => {
                res.redirect('/account/edit');
            }).catch(e => { res.status(500).send(e) });
        }).catch(e => { res.status(500).send(e) });
    } else {
        res.redirect('/login');
    };
});

a.get('/:fileName', async function (req, res) {
    let name = req.params.fileName;
    await gfs.files.findOne({ filename: name }, (err, file) => {
        if (err) return console.log(err);
        if (!file || file.length === 0) return res.status(404).send(`Could not find file '${name}'.`);
        const readstream = gridFSBucket.openDownloadStream(file._id);
        return readstream.pipe(res);
    });
});


module.exports =  a;