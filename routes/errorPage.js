const config = require('./config.json');
const user = require('./db/user');
const jwt = require('jsonwebtoken');
const userAuth = require('../routes/db/auth');
const { authJWT, authJWTLogout } = require('../routes/middleware/auth');

async function error404(req, res) {
    let {theme, auth} = req.cookies;
    if (!theme) theme = null;
    if (!auth) auth = null;
    let findUser = null;
    let uA = await userAuth.findOne({ Id: auth });
    if (uA) findUser = user.findOne({ _id: uA.user });
    res.status(404).render('./error/index', { theme: theme, errorMessage: config.errors[404], u: findUser });
}

module.exports = {
    error404
}