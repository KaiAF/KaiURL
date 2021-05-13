const a = require('express').Router();
const fetch = require('node-fetch');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const capeConfig = require('../db/capes/config');
const capes = require('../db/capes/capes');

var url = process.env.MONGODB;
async function checkfName(req, file) {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/png') {
        return `${file.originalname.replace('.png', '')}.png`;;
    }
}
const storage = new gridFS({ url, options: {useUnifiedTopology: true}, file: (req, file) => {    
    let name = checkfName(req, file).then((n) => {
        return {
            bucketName: 'mcmCapes',
            filename: `${n}`
        };
    });
    return name;
}});
async function Filter(req, file, cb) {
    if (!file) return cb(new Error(`Could not find file.`));
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg") {
        cb(null, true);
    } else {
        cb(new Error(`'${file.mimetype}' is an Invalid File type.`));
    }
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
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'mcmCapes' });
    gfs = Grid(conn.db, mongoose.mongo); 
    gfs.collection('mcmCapes');
});

a.get('/edit', async function (req, res) {
    let {theme, auth, capeId} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!capeId) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
        await capes.findOne({ Id: capeId }, async function (e, r) {
            let {q} = req.query;
            if (!r || !q) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            let findAuth = r.Id.split('-');
            if (findAuth[0] !== q) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            res.render('./capes/index', { theme: theme, u: findUser, cape: r });
        });
    }).catch(e => { console.log(e); res.send('Error') });
});

a.get('/edit/auth', async function (req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let {uuid, id} = req.query;
        if (!uuid || !id) return res.sendStatus(401);
        fetch('https://sessionserver.mojang.com/session/minecraft/profile/' + uuid, {
            method: 'get'
        }).then((r)=>r.json()).then(async (b)=>{
            if (b.error) return console.log(b);
            await capes.findOne({ uuid: uuid }, async function (e, r) {
                let capeIdAuth = Math.random().toFixed(20).substring(2);
                if (!r) {
                    new capes({
                        date: new Date(),
                        user: b.name,
                        uuid: b.id,
                        cape: null,
                        capeId: Math.random(1).toFixed(22).substring(2),
                        linked: false,
                        Id: `${id}-${capeIdAuth}`
                    }).save().then(()=>{
                        res.cookie('capeId', `${id}-${capeIdAuth}`);
                        res.redirect('/capes/edit?q=' + id);
                    });
                } else {
                    capes.updateOne({ _id: r._id }, { $set: {Id: `${id}-${capeIdAuth}`,cape:`/capes/${b.name}.png`} }).then(()=>{
                        res.cookie('capeId', `${id}-${capeIdAuth}`);
                        res.redirect('/capes/edit?q=' + id);
                    });
                }
            });
        }).catch(e=>{res.sendStatus(401)});
    }).catch(e => { console.log(e); res.send('Error') });
});

a.post('/create', async function (req, res) {
    let {theme, auth, capeId} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!capeId) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
        await capes.findOne({ Id: capeId }, async function (e, r) {
            let {q, id} = req.query;
            if (!r || !q || !id) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            let findAuth = r.Id.split('-');
            if (findAuth[0] !== q) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            if (r.capeId !== id) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            capes.updateOne({ _id: r._id }, { $set: { linked: true, Id: null } }).then(()=> {
                res.render('./error/index', { theme: theme, u: findUser, errorMessage: `Account is linked. Now press the edit cape button ingame again.` });
            });
        });
    }).catch(e => { console.log(e); res.send('Error') });
});

a.post('/upload/:user/:Id', upload.single('File'), async function (req, res) {
    if (!req.file) return res.status(500).json({ OK: false, error: { message: 'Could not find file' } });
    let {theme, auth, capeId} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    if (!capeId) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        let {q} = req.query; if (!q) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        await capes.findOne({ user: req.params.user, capeId: req.params.Id, Id: capeId }, async function (e, r) {
            if (!r) return res.status(401).json({ OK: false, error: { message: `Could not find cape profile` } });
            fetch('https://api.mojang.com/users/profiles/minecraft/' + r.user, {
                method: 'get'
            }).then((r)=>r.json()).then(async (b)=>{
                await gfs.files.findOne({ uuid: r.uuid }, async function (e, re) {
                    if (!re) {
                        await gfs.files.findOne({ _id: req.file.id }, async function (e, r) {
                            if (e) return res.status(500).json({ OK: false, error: e });
                            if (!r) return res.status(500).json({ OK: false, error: 'Could not find File.' });
                            if (r) {
                                await gfs.files.updateOne({ _id: r._id }, { $set: { user: b.name.toUpperCase() + ".PNG", uuid: b.id } }).then(() => {
                                    res.redirect(req.headers.referer);
                                });
                            }
                        });
                    } else {
                        gfs.db.collection('mcmCapes.chunks').deleteMany({ files_id: re._id }).then(async () => {
                            gfs.files.deleteOne({ _id: re._id }).then(async () => {
                                await gfs.files.findOne({ _id: req.file.id }, async function (e, r) {
                                    if (e) return res.status(500).json({ OK: false, error: e });
                                    if (!r) return res.status(500).json({ OK: false, error: 'Could not find File.' });
                                    if (r) {
                                        await gfs.files.updateOne({ _id: r._id }, { $set: { user: b.name.toUpperCase() + ".PNG", uuid: b.id } }).then(() => {
                                            res.redirect(req.headers.referer);
                                        });
                                    }
                                });
                            }).catch(e => { res.status(500).send(e) });
                        });
                    }
                });
            });
        });
    }).catch(e => { console.log(e); res.send('Error') });
});

a.post('/delete/:user/:Id', async function (req, res) {
    let {theme, auth, capeId} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    if (!capeId) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async (r) => r.json()).then(async (b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        let {q} = req.query; if (!q) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        await capes.findOne({ user: req.params.user, capeId: req.params.Id, Id: capeId }, async function (e, r) {
            if (!r) return res.status(401).json({ OK: false, error: { message: `Could not find cape profile` } });
            fetch('https://api.mojang.com/users/profiles/minecraft/' + r.user, {
                method: 'get'
            }).then((r)=>r.json()).then(async (b)=>{
                await gfs.files.findOne({ uuid: r.uuid }, async function (e, re) {
                    if (!re) {
                        res.status(500).json({ OK: false, error: { message: "Could not find cape to remove" } });
                    } else {
                        gfs.db.collection('mcmCapes.chunks').deleteMany({ files_id: re._id }).then(async () => {
                            gfs.files.deleteOne({ _id: re._id }).then(async () => {
                                res.redirect(req.headers.referer);
                            }).catch(e => { res.status(500).send(e) });
                        });
                    }
                });
            });
        });
    }).catch(e => { console.log(e); res.send('Error') });
});

a.get('/:user', async function (req, res) {
    res.redirect('https://api.kaiurl.xyz/capes/' + req.params.user);
});

module.exports = a;