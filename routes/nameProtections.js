const blocked_names = require('./db/blockedName');

async function checkName(req, res, name) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    // This is not the best AT ALL. So I added more checks in other code.
    if (!name || name.indexOf(' ') >= 0) return res.json({ "OK": false, error: `Invalid username.` });
    let a;
    await blocked_names.findOne({ title: 'list' }, async (err, re) => {
        if (err) return res.send(err);
        if (re == null) a = null
        if (re) {
            try {
                if (re.name.includes(name)) {
                    a = true
                } else {
                    a = null
                }
            } catch {
                return res.json({ "OK": false, error: `There was an error in the blockname function. Contact the developer.` })
            }
        }
    });
    if (a === undefined) return true
    if (a !== undefined) return a
}

async function db(name) {
    let a;
    await blocked_names.findOne({ name: name }, async (err, re) => {
        if (err) return res.send(err);
        if (re == null) a = false
        if (re) a = true
    });
    return a;
}

module.exports = {
    checkName
}