const a = require('express').Router();
const fetch = require('node-fetch');
const account = require('../db/capes/account');
const capes = require('../db/capes/capes');
const ears = require('../db/capes/ears');
const user = require('../db/user');

a.get('/account', async function (req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = "";
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then((r) => r.json()).then(async function (b) {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        if (!findUser) return res.redirect('/login?redirect=/mcm/account');
        await account.findOne({ linkedUser: findUser.userid }, async function (e, r) {
            if (!r) return res.status(404).render('./error/index', { theme: theme, u: findUser, errorMessage: "You need to link your Minecraft account!" });
            res.render('./capes/account/create', { theme: theme, u: findUser });
        });
    });
});

a.get('/account/:id', async function (req, res) {
    let { theme, auth } = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = "";
    fetch(`http://${req.hostname}/api/auth?q=${auth}`, { method: 'get' }).then((r) => r.json()).then(async function (b) {
        let findUser = null;
        if (b.OK == true) findUser = await user.findOne({ _id: b.user._id });
        if (b.OK == false && b.code == 12671) return res.redirect('/logout?q=' + req.originalUrl);
        let { uuid, user } = req.query;
        if (!uuid || !user) return res.json({ OK: false, message: "Could not authenticate code" });
        fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, { method: 'get' }).then((r)=>r.json()).then(async function (re) {
            await account.findOne({ code: req.params.id, uuid: re.id }, async function (e, r) {
                if (!r) return res.json({ OK: false, message: "Could not authenticate code" });
                await account.updateOne({ uuid: r.uuid }, { $set: { code: null, linked: true } }).then(()=>{
                    new capes({
                        date: new Date(),
                        user: r.user,
                        uuid: r.uuid,
                        cape: null,
                        capeId: Math.random(1).toFixed(22).substring(2),
                        linked: true,
                        cfg: {
                            glow: false,
                            active: true
                        }
                    }).save().then(()=>{
                        new ears({
                            date: new Date(),
                            user: r.user,
                            uuid: r.uuid,
                            ears: null,
                            earId: Math.random(1).toFixed(22).substring(2),
                            cfg: {
                                active: false,
                                scaleX: 1, 
                                scaleY: 1, 
                                scaleZ: 1
                            }
                        }).save().then(()=>{
                            res.json({ OK: true, message: "Linked!" });
                        });
                    });
                });
            });
        }).catch(e=>{ res.json({ OK: false, message: "You must be using a premium Minecraft account!" }) });;
    });
});

module.exports = a;