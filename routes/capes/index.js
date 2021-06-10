const a = require('express').Router();
const fetch = require('node-fetch');
const { Image, createCanvas } = require('canvas');
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');
const capes = require('../db/capes/capes');
const account = require('../db/capes/account');
const user = require('../db/user');

var url = process.env.MONGODB;

async function Filter(req, file, cb) {
    if (!file) return cb(new Error(`Could not find file.`));
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg") {
        cb(null, true);
    } else {
        cb(new Error(`'${file.mimetype}' is an Invalid File type.`));
    }
}

const upload = multer({ fileFilter: Filter });

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

a.get('/:name/edit', async function (req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = "";
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then((r) => r.json()).then(async function (b) {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=/capes/'+req.params.name+'/edit');
        await account.findOne({ linkedUser: findUser.userid, linked: true, user: req.params.name }, async function (e, r) {
            if (!r) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: "Could not find Linked accounts" });
            let cape = await capes.findOne({ uuid: r.uuid });
            res.render('./capes/index', { theme: theme, u: findUser, cape: cape });
        });
    });
});

a.get('/edit/auth', async function (req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = "";
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then((r) => r.json()).then(async function (b) {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.status(401).render('./error/index', { theme: theme, u: findUser, errorMessage: "Please log in to create an account: <a href=\"/login\">/login</a>" })
        let { uuid, id } = req.query;
        if (!uuid || !id) return res.sendStatus(401);
        fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, { method: 'get' }).then((r)=>r.json()).then(async function (re) {
            if (re.error) return res.status(404).send(re.error);
            await account.findOne({ uuid: uuid }, async function(e, r) {
                let capeIdAuth = Math.random().toFixed(20).substring(2);
                let randomCode = Math.random().toString(15).substring(2);
                if (!r) {
                    new account({
                        date: new Date(),
                        user: re.name,
                        uuid: re.id,
                        Id: capeIdAuth + capeIdAuth,
                        code: randomCode,
                        linkedUser: findUser.userid
                    }).save().then(()=> { res.render('./capes/account/beforeCreate', { theme: theme, u: findUser, code: randomCode }) });
                } else {
                    if (r.linked==true) {
                        res.redirect('/capes/'+r.user+'/edit');
                    } else {
                        account.updateOne({ uuid: re.id }, { $set: {
                            date: new Date(),
                            user: re.name,
                            uuid: re.id,
                            Id: capeIdAuth + capeIdAuth,
                            code: randomCode,
                            linkedUser: findUser.userid
                        } }).then(()=> { res.render('./capes/account/beforeCreate', { theme: theme, u: findUser, code: randomCode }) });
                    }
                }
            });
        });
    });
});

a.post('/upload/:name', upload.single('File'), async function (req, res) {
    let {auth} = req.cookies;
    if (!auth) auth = "";
    if (!req.file) return res.redirect('/capes/'+req.params.name+'/edit');
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then((r) => r.json()).then(async function (b) {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=/capes/'+req.params.name + "/edit");
        if (!req.file) return res.send('Could not find Image');
        await account.findOne({ linkedUser: findUser.userid, user: req.params.name }, async function (e, r) {
            if (!r) return res.status(500).send('Could not find account');
            let texture = req.file.buffer.toString('base64');
            await capes.findOne({ uuid: r.uuid }, async function (e, re) {
                if (!re) return res.sendStatus(500);
                capes.updateOne({ _id: re._id }, { $set: { cape: texture } }).then(()=>{
                    res.redirect(`/capes/${r.user}/edit`);
                });
            });
        });
    });
});

a.post('/delete/:name', async function (req, res) {
    let {auth} = req.cookies;
    if (!auth) auth = "";
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then((r) => r.json()).then(async function (b) {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=/capes/'+req.params.name + "/edit");
        await account.findOne({ linkedUser: findUser.userid, user: req.params.name }, async function (e, r) {
            if (!r) return res.status(500).send('Could not find account');
            await capes.findOne({ uuid: r.uuid }, async function (e, re) {
                if (!re) return res.sendStatus(500);
                capes.updateOne({ _id: re._id }, { $set: { cape: null } }).then(()=>{
                    res.redirect(`/capes/${r.user}/edit`);
                });
            });
        });
    });
});

a.get('/:user', async function(req, res) {
    res.redirect(`https://api.kaiurl.xyz/capes/${req.params.user}.png`);
});

module.exports = a;