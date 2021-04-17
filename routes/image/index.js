const a = require('express').Router();
const path = require('path');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const { checkPerm } = require('../permissions');
const { error404 } = require('../errorPage');
require('dotenv').config();

var url = process.env.MONGODB;

const user = require('../db/user');
const apiKey = require('../db/apiKey');
const fetch = require('node-fetch');
const config = require('../config.json');

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
        //if (file.mimetype == "image/vnd.microsoft.icon" || file.mimetype == 'application/java-archive' || file.mimetype == 'application/x-msdos-program')
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
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser) checkUser = null;
    res.render('./image/index', { theme: theme, u: checkUser });
});

a.get('/admin', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser) return error404(req, res);
    if (await checkPerm(checkUser.userid) !== "ADMIN") return error404(req, res);
    await gfs.files.find({}).sort({ uploadDate: -1 }).toArray((e, files) => {
        let a = [];
        if (!files || files.length === 0) a = null;
        if (files || files.length > 0) {
            files.map(f => {
                a.push(f);
            });
        }
        res.render('./image/all', { theme: theme, u: checkUser, img: a });
    }); 
});

a.get('/:fileName/admin', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser) return error404(req, res);
    if (await checkPerm(checkUser.userid) !== "ADMIN") return error404(req, res);
    let findImages = await gfs.files.findOne({ filename: req.params.fileName });
    if (!findImages) return error404(req, res);

    res.render('./image/admin.ejs', { theme: theme, u: checkUser, image: findImages })
});

a.post('/:fileName/delete', async function (req, res) {
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser || await checkPerm(checkUser.userid) !== "ADMIN") return res.status(404).render('./error/index', { errorMessage: 'You do not have access to this page.', theme: theme, u: checkUser });
    let findImages = await gfs.files.findOne({ filename: req.params.fileName });
    if (findImages) {
        await gfs.files.updateOne({ filename: req.params.fileName }, { $set: { removed: true } }).then(() => { res.redirect('/i/' + req.params.fileName + '/admin'); });
    }
});

a.post('/:fileName/delete/admin', async function (req, res) {
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser || await checkPerm(checkUser.userid) !== "ADMIN") return res.status(404).render('./error/index', { errorMessage: 'You do not have access to this page.', theme: theme, u: checkUser });
    let findImages = await gfs.files.findOne({ filename: req.params.fileName });
    if (findImages) {
        await gfs.db.collection('Images.chunks').deleteMany({ files_id: findImages._id }).then(async () => {
            await gfs.files.deleteOne({ _id: findImages._id }).then(() => {
                res.redirect('/i/admin');
            }).catch(e => { res.status(500).send(e) });
        }).catch(e => { res.status(500).send(e) });
    } else {
        res.status(500).json({ OK: false, error: 'Could not find file.' });
    };
});

a.post('/:fileName/add', async function (req, res) {
    let checkUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!checkUser || await checkPerm(checkUser.userid) !== "ADMIN") return error404(req, res);
    let findImages = await gfs.files.findOne({ filename: req.params.fileName });
    if (findImages) {
        await gfs.files.updateOne({ filename: req.params.fileName }, { $set: { removed: false } }).then(() => { res.redirect('/i/' + req.params.fileName + '/admin'); });
    }
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

a.get('/:fileName/embed', async function (req, res) {
    let name = req.params.fileName
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let findUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (findUser == null) findUser = null;
    await gfs.files.findOne({ filename: name }, (err, file) => {
        if (err) return console.log(err);
        if (!file || file.length === 0) return error404(req, res);
        if (findUser) {
            if (file.removed == true && findUser.perms !== "ADMIN") return error404(req, res);
        } else {
            if (file.removed == true) return error404(req, res);
        }
        const readstream = gridFSBucket.openDownloadStream(file._id);
        return readstream.pipe(res);
    });
});

a.get('/:fileName', async function (req, res) {
    let name = req.params.fileName
    let findUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (findUser == null) findUser = null;
    await gfs.files.findOne({ filename: name }, (err, file) => {
        if (err) return console.log(err);
        if (!file || file.length === 0) return error404(req, res);
        if (findUser) {
            if (file.removed == true && findUser.perms !== "ADMIN") return error404(req, res);
            if (file.removed == true && findUser.perms == "ADMIN") res.redirect(`/i/${file.filename}/admin`);
        } else {
            if (file.removed == true) return error404(req, res);
        }
        const readstream = gridFSBucket.openDownloadStream(file._id);
        return readstream.pipe(res);
    });
});


module.exports =  a;