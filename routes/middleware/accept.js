function acceptPolicy(req, res, next) {
    let theme = req.cookies.Theme; if (!theme) theme = null;
    if (!req.body.accepted) return res.status(401).render('./error/index', { theme: theme, u:null, errorMessage: `You need to accept the <a href="/privacy" target="_">Privacy Policy</a>!` });
    next();
}

module.exports = {
    acceptPolicy
}