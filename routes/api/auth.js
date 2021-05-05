require('dotenv').config();
const a = require('express').Router();
const jwt = require('jsonwebtoken');
const { authJWT } = require('../middleware/auth');
const userAuth = require('../db/auth');
const user = require('../db/user');

const secret_key = process.env.SECRET_KEY;

a.get('/', authJWT, async function (req, res) {
    let error = { message: `Could not authenticate request.`, status: 401 };
    if (req.headers['user-agent'] !== "KaiURL.xyz Auth") return res.status(401).json({ OK: false, error, code: 189247 });
    let {q} = req.query;
    if (!q) return res.status(401).json({ OK: false, error, code: 176254 });
    await userAuth.findOne({ Id: q }, async function (e, r) {
        if (!r) return res.status(401).json({ OK: false, error, code: 15611 }); 
        let token = r.auth;
        jwt.verify(token, secret_key, async (err, t) => {
            if (err) { res.status(401).json({ OK: false, error, code: 12671 }); } else {
                await user.findOne({ auth_key: t.key }, async function (e, re) {
                    if (!re) return res.status(401).json({ OK: false, error, code: 75617 });
                    res.json({ OK: true, user: re });
                });
            };
        });
    });
});

a.get('/account', async function (req, res) {
    let error = { message: `Could not authenticate request.`, status: 401 };
    if (!req.cookies.auth) return res.status(401).json({ OK: false, error });
    await userAuth.findOne({ Id: req.cookies.auth }, async function (e, r) {
        if (!r) return res.status(401).json({ OK: false, error }); 
        await user.findOne({ _id: r.user }, { _id: 0, email: 0, pass: 0, officialEmail: 0, auth_key: 0, __v: 0 }, async function (e, re) {
            if (!re) return res.status(401).json({ OK: false, error });
            res.json({ OK: true, user: re });
        });
    });
});

module.exports = a;