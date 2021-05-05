require('dotenv').config();
const jwt = require('jsonwebtoken');
const rId_auth = require('crypto');
const crypto = require('crypto-js');

const user = require('../db/user');
const userAuth = require('../db/auth');
const secret_key = process.env.SECRET_KEY;

async function authJWT(req, res, next) {
    let {auth} = req.cookies;
    if (!auth) { res.header('auth', [false]); next(); } else {
        await userAuth.findOne({ Id: auth }, async function (e, r) {
            if (e) return res.status(500).send(e);
            if (r) {
                await user.findOne({ _id: r.user }, async (er, re) => {
                    if (er) return res.status(500).send(er);
                    if (re) {
                        if (re.removed) {
                            res.header('auth', [false]);
                            next();
                        } else {
                            let token = r.auth;
                            jwt.verify(token, secret_key, async (err, user) => {
                                if (err) { res.header('auth', [false]); res.clearCookie('auth'); next(); } else {
                                    req.user = user;
                                    res.header('auth', [true]);
                                    next();
                                };
                            });
                        }
                    } else {
                        res.header('auth', [false]);
                        res.clearCookie('auth');
                        next();
                    }
                });
            } else {
                res.header('auth', [false]);
                res.clearCookie('auth');
                next();
            }
        });
    };
};


async function authJWTLogout(req, res, next) {
    let {auth} = req.cookies;
    if (!auth) { res.header('auth', [false]); next(); } else {
        await userAuth.findOne({ Id: auth }, async function (e, r) {
            if (e) return res.status(500).send(e);
            if (r) {
                await userAuth.deleteOne({ _id: r._id }).then(async () => {
                    await user.updateOne({ _id: r.user }, { $set: { auth_key: null } }).then(() => { res.header('auth', [false]); next(); });
                });
            } else {
                res.header('auth', [false]);
                next();
            };
        });
    };
}

async function createAuth(req, res, next) {
    let { username, password } = req.body;
    if (!username || !password) return res.status(401).json({ OK: false, error: `You need to enter a username or password!` });

    var parse_pass = crypto.enc.Utf8.parse(password);
    var enc_pass = crypto.enc.Base64.stringify(parse_pass);

    await user.findOne({ officialName: username.toUpperCase(), pass: enc_pass }, async function (e, r) {
        if (e) return res.status(500).json({ OK: false, error: e });
        if (!r) return res.status(500).json({ OK: false, error: 'Could not find user.' });
        let rId = Math.random(1).toFixed(17).substring(2);
        let authId = rId_auth.randomBytes(16).toString('hex')
        const JWT = jwt.sign({ user: r.userid, key: rId, id: authId }, secret_key, { expiresIn: '5m' })
        let checkAuth = await userAuth.findOne({ user: r._id });
        if (checkAuth) {
            await checkAuth.deleteOne({ _id: checkAuth._id }).then(async () => {
                new userAuth({
                    date: new Date(),
                    user: r._id,
                    auth: JWT,
                    Id: authId
                }).save().then(async () => {
                    await user.updateOne({ _id: r._id }, { $set: { auth_key: rId } }).then(() => {
                        res.cookie('auth', authId);
                        next();
                    });
                });
            });
        } else {
            new userAuth({
                date: new Date(),
                user: r._id,
                auth: JWT,
                Id: authId
            }).save().then(async () => {
                await user.updateOne({ _id: r._id }, { $set: { auth_key: rId } }).then(() => {
                    res.cookie('auth', authId);
                    next();
                });
            });
        }
    });
};

module.exports = { authJWT, authJWTLogout, createAuth };