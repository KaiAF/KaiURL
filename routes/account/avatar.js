const a = require('express').Router();
const path = require('path');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
require('dotenv').config();

var url = process.env.MONGODB;

const storage = new gridFS({ url, file: (req, file) => {
        if (file.mimetype === "image/jpeg" || file.mimetype === 'image/png') {
            return {
                bucketName: 'kaiurlImages',
                filename: `${req.cookies.token}-${req.cookies.auth}.png`
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
    useCreateIndex: true,
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

a.post('/', upload.single('Image'), function (req, res) {
    res.redirect('/account/edit');
});

a.post('/delete', async function (req, res) {
    if (req.cookies.token && req.cookies.auth) {
        let name = `${req.cookies.token}-${req.cookies.auth}.png`
        await gfs.files.findOne({ filename: name }, async (err, re) => {
            if (err) return res.send(err);
            if (re == null) return res.send("Could not find file");
            if (re) {
                await gfs.files.deleteOne({ _id: re._id }).then(() => {
                    res.redirect('/account/edit');
                });
            };
        });
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