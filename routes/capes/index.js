const a = require('express').Router();
const fetch = require('node-fetch');
const { Image, createCanvas } = require('canvas');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const capeConfig = require('../db/capes/config');
const capes = require('../db/capes/capes');
const capeAccount = require('../db/capes/account');

var url = process.env.MONGODB;
async function checkfName(req, file) {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/png') {
        return `${file.originalname.replace('.png', '')}.png`;;
    }
}
const storage = new gridFS({
    url,
    options: { useUnifiedTopology: true },
    file: (req, file) => {
        let name = checkfName(req, file).then((n) => {
            return {
                bucketName: 'mcmCapes',
                filename: `${n}`
            };
        });
        return name;
    }
});
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

function canvas(image, x, y, w, h) {
    let version = (image.height >= 64 ? 1 : 0);
    x = (typeof x === 'undefined' ? 0 : x);
    y = (typeof y === 'undefined' ? 0 : y);
    if (version == 0) {
        w = (typeof w === 'undefined' ? 288 : w);
        h = (typeof h === 'undefined' ? 288 : h);
    } else {
        w = (typeof w === 'undefined' ? image.width * 4.5 : w);
        h = (typeof h === 'undefined' ? image.height * 4.5 : h);
    }

    let canvas = createCanvas(w, h);
    canvas.width = w;
    canvas.height = h;
    return canvas;
}

function capeScale(height) {
    if (height % 22 === 0) {
        return height / 22;
    } else if (height % 17 === 0) {
        return height / 17;
    } else if (height >= 32 && (height & (height - 1)) === 0) { // power of 2
        return height / 32;
    } else {
        return Math.max(1, Math.floor(height / 22));
    }
}

a.get('/view/:name', async function (req, res) {
    let { width, height, n } = req.query;
    if (!width) width = 40;
    if (!height) height = 64;
    let image = new Image();
    image.onload = function() {
        let op = canvas(image, 0, 0, 269, 256);
        let context = op.getContext('2d');
        context.save();

        context.mozImageSmoothingEnabled = false;
        context.webkitImageSmoothingEnabled = false;
        context.msImageSmoothingEnabled = false;
        context.imageSmoothingEnabled = false;

        let cs = capeScale(image.height);

        context.drawImage(image, cs, cs, 10 * cs, 16 * cs, 0, 0, op.width / 2.3, op.height - parseInt(height));
        context.drawImage(image, 36 * cs, 2 * cs, 11 * cs, 20 * cs, parseInt(width) * 3, 0, op.width / 2, op.height);

        var base64Data = op.toDataURL().replace("data:image/png;base64,", '');
        var img = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
    }
    image.onerror = function() { console.error(`Error Loading Cape Image`); res.sendStatus(404); };
    image.src = `http://api.kaiurl.xyz/capes/${req.params.name}.png`;
});

a.get('/edit', async function(req, res) {
    let { theme, auth, capeId, sessionId } = req.cookies;
    let {q} = req.query;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!capeId) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
        await capes.findOne({ Id: capeId }, async function(e, r) {
            if (!r || !q) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            let findAuth = r.Id.split('-');
            if (findAuth[0] !== q) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            res.render('./capes/index', { theme: theme, u: findUser, cape: r });
        });
    }).catch(e => { console.log(e);
        res.send('Error') });
});

a.get('/edit/auth', async function(req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let { uuid, id } = req.query;
        if (!uuid || !id) return res.sendStatus(401);
        fetch('https://sessionserver.mojang.com/session/minecraft/profile/' + uuid, {
            method: 'get'
        }).then((r) => r.json()).then(async(b) => {
            if (b.error) return res.sendStatus(500);
            await capes.findOne({ uuid: uuid }, async function(e, r) {
                let capeIdAuth = Math.random().toFixed(20).substring(2);
                let DATE = r.date.toString().split(' ');
                let dateTime = `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
                if (!r) {
                    new capes({
                        date: new Date(),
                        user: b.name,
                        uuid: b.id,
                        cape: null,
                        capeId: Math.random(1).toFixed(22).substring(2),
                        linked: false,
                        Id: `${id}-${capeIdAuth}${capeIdAuth}${capeIdAuth}`,
                        sessionId: `${capeIdAuth}${capeIdAuth}${capeIdAuth}${capeIdAuth}`
                    }).save().then(() => {
                        res.cookie('capeId', `${id}-${capeIdAuth}${capeIdAuth}${capeIdAuth}`);
                        res.cookie('sessionId', `${capeIdAuth}${capeIdAuth}${capeIdAuth}${capeIdAuth}`)
                        res.redirect('/capes/edit?q=' + id);
                    });
                } else {
                    capes.updateOne({ _id: r._id }, { $set: { Id: `${id}-${capeIdAuth}${capeIdAuth}${capeIdAuth}`, cape: `/capes/${b.name}.png`, date: new Date() } }).then(() => {
                        res.cookie('capeId', `${id}-${capeIdAuth}${capeIdAuth}${capeIdAuth}`);
                        res.redirect('/capes/edit?q=' + id);
                    });
                }
            });
        }).catch(e => { res.sendStatus(401) });
    }).catch(e => { console.log(e); res.sendStatus(500); });
});

a.post('/create', async function(req, res) {
    let { theme, auth, capeId } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!capeId) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
        await capes.findOne({ Id: capeId }, async function(e, r) {
            let { q, id } = req.query;
            if (!r || !q || !id) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            let findAuth = r.Id.split('-');
            if (findAuth[0] !== q) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            if (r.capeId !== id) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: `Could not authenticate request` });
            capes.updateOne({ _id: r._id }, { $set: { linked: true, Id: null } }).then(async () => {
                await fetch('https://api.kaiurl.xyz/models/ears/'+findUser.user+'/create', { method:'post' });
                res.render('./error/index', { theme: theme, u: findUser, errorMessage: `Account is linked. Now press the edit cape button ingame again.` });
            });
        });
    }).catch(e => { console.log(e);
        res.send('Error') });
});

a.post('/upload/:user/:Id', upload.single('File'), async function(req, res) {
    if (!req.file) return res.status(500).json({ OK: false, error: { message: 'Could not find file' } });
    let { theme, auth, capeId } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    if (!capeId) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        let { q } = req.query;
        if (!q) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        await capes.findOne({ user: req.params.user, capeId: req.params.Id, Id: capeId }, async function(e, r) {
            if (!r) return res.status(401).json({ OK: false, error: { message: `Could not find cape profile` } });
            fetch('https://api.mojang.com/users/profiles/minecraft/' + r.user, {
                method: 'get'
            }).then((r) => r.json()).then(async(b) => {
                await gfs.files.findOne({ uuid: r.uuid }, async function(e, re) {
                    if (!re) {
                        await gfs.files.findOne({ _id: req.file.id }, async function(e, r) {
                            if (e) return res.status(500).json({ OK: false, error: e });
                            if (!r) return res.status(500).json({ OK: false, error: 'Could not find File.' });
                            if (r) {
                                await gfs.files.updateOne({ _id: r._id }, { $set: { user: b.name.toUpperCase() + ".PNG", uuid: b.id } }).then(() => {
                                    res.redirect(req.headers.referer);
                                });
                            }
                        });
                    } else {
                        gfs.db.collection('mcmCapes.chunks').deleteMany({ files_id: re._id }).then(async() => {
                            gfs.files.deleteOne({ _id: re._id }).then(async() => {
                                await gfs.files.findOne({ _id: req.file.id }, async function(e, r) {
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
    }).catch(e => { console.log(e);
        res.send('Error') });
});

a.post('/delete/:user/:Id', async function(req, res) {
    let { theme, auth, capeId } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = ""
    if (!capeId) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then(async(r) => r.json()).then(async(b) => {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        let { q } = req.query;
        if (!q) return res.status(401).json({ OK: false, error: { message: `Could not authenticate request` } });
        await capes.findOne({ user: req.params.user, capeId: req.params.Id, Id: capeId }, async function(e, r) {
            if (!r) return res.status(401).json({ OK: false, error: { message: `Could not find cape profile` } });
            fetch('https://api.mojang.com/users/profiles/minecraft/' + r.user, {
                method: 'get'
            }).then((r) => r.json()).then(async(b) => {
                await gfs.files.findOne({ uuid: r.uuid }, async function(e, re) {
                    if (!re) {
                        res.status(500).json({ OK: false, error: { message: "Could not find cape to remove" } });
                    } else {
                        gfs.db.collection('mcmCapes.chunks').deleteMany({ files_id: re._id }).then(async() => {
                            gfs.files.deleteOne({ _id: re._id }).then(async() => {
                                res.redirect(req.headers.referer);
                            }).catch(e => { res.status(500).send(e) });
                        });
                    }
                });
            });
        });
    }).catch(e => { console.log(e);
        res.send('Error') });
});

a.get('/:user', async function(req, res) {
    res.redirect('https://api.kaiurl.xyz/capes/' + req.params.user);
});

module.exports = a;