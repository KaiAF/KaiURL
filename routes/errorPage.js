const config = require('./config.json');
const user = require('./db/user');
async function error404(req, res) {
    let theme = req.cookies.Theme; 
    if (!theme) theme = null;
    let findUser = await user.findOne({ _id: req.cookies.auth, auth_key: req.cookies.auth_key });
    if (!findUser) findUser = null;
    res.status(404).render('./error/index', { theme: theme, errorMessage: config.errors[404], u: findUser });
}

module.exports = {
    error404
}