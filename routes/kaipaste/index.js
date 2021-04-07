const a = require('express').Router();
const crypto = require('crypto-js');
const { checkPerm } = require('../permissions');

const text = require('../db/kaipaste');
const user = require('../db/user');

a.get('/', async function (req, res) {
  let theme = req.cookies.Theme;
  if (!theme) theme = null;
  let check_user = await user.findOne({ auth_key: req.cookies.auth_key, _id: req.cookies.auth });
  if (!check_user) return res.redirect('/login?redirect=/kaipaste');
  res.render('./kaipaste/index', { theme: theme, u: check_user });
});

a.post('/create', async function (req, res) {
    let username = req.cookies.userName;
    let auth_key = req.cookies.auth_key;
    if (!auth_key && username) return res.status(404).json({ "OK": false, errorMessage: `Could not authenticate user.` });
    let findUser = await user.findOne({ auth_key: auth_key, _id: req.cookies.auth });
    if (!findUser) return res.status(404).json({ "OK": false, errorMessage: `Could not authenticate user.` });
    if (!req.body.title) return res.status(404).json({ "OK": false, errorMessage: `You need to have a title` });
    if (!req.body.desc) return res.status(404).json({ "OK": false, errorMessage: `You need to have a description` });
    let r = Math.random().toString(35).substring(5);
    new text({
        id: r,
        title: req.body.title,
        description: req.body.desc,
        date: Date.now(),
        user: username,
        userID: findUser.userid,
        removed: false
    }).save().then(() => {
        return res.json({ "OK": true, message: `/kaipaste/${r}` });
    });
});

a.get('/admin', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let check_user = await user.findOne({ auth_key: req.cookies.auth_key, _id: req.cookies.auth });
    let kP = await text.find();
    if (!check_user) return res.redirect('/');
    if (await checkPerm(check_user.userid) !== "ADMIN") return res.status(404).render('./error/index', { theme: theme, errorMessage: `You need to be an admin to view this page.`, u: check_user });
    res.render('./kaipaste/admin/index', { theme: theme, u: check_user, paste: kP });
});

a.get('/:id', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    await text.findOne({ id: req.params.id }, async function (err, re) {
        if (err) return res.send(err);
        if (re == null) return res.render('./error/index', { errorMessage: `Could not find URL`, u: null, log: false, theme: theme });
        if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
        res.write(re.description);
        res.send();
    });
});

a.get('/remove/:id', async function (req, res) {
    let check_user = await user.findOne({ auth_key: req.cookies.auth_key, _id: req.cookies.auth });
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!check_user) return res.redirect('/');
    if (check_user.userid !== "40922208590827513497") return res.status(404).render('./error/index', { theme: theme, errorMessage: `You need to be an admin to view this page.` });
    let kP = await text.findOne({ id: req.params.id });
    if (!kP) return res.status(404).render('./error/index', { theme: theme, errorMessage: `Could not find paste.` });
    res.render('./kaipaste/admin/remove', { theme: theme, u: check_user, paste: kP });
});

a.post('/remove', async function (req, res) {
    let check_user = await user.findOne({ auth_key: req.cookies.auth_key, _id: req.cookies.auth });
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!check_user) return res.status(404).json({ 'OK': false, error: `Auth failed.` });
    if (check_user.userid !== "40922208590827513497") return res.status(404).json({ 'OK': false, error: `Auth failed.` });
    // ENC PASS:
    var parse_pass = crypto.enc.Utf8.parse(req.body.pass);
    var enc_pass = crypto.enc.Base64.stringify(parse_pass);
    if (check_user.pass !== enc_pass) return res.status(404).json({ "OK": false, error: `Auth failed.` });
    let kP = await text.findOne({ id: req.body.id });
    if (!kP) return res.status(404).json({ 'OK': false, error: `Could not find paste.` });
    if (kP.removed) return res.status(404).json({ 'OK': false, error: `Paste is already removed.` });
    await text.updateOne({ _id: kP._id }, { $set: { removed: true } }).then(() => {
        return res.json({ 'OK': true, message: `Removed paste.` });
    });
});

a.get('/add/:id', async function (req, res) {
    let check_user = await user.findOne({ auth_key: req.cookies.auth_key, _id: req.cookies.auth });
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!check_user) return res.redirect('/');
    if (check_user.userid !== "40922208590827513497") return res.status(404).render('./error/index', { theme: theme, errorMessage: `You need to be an admin to view this page.` });
    let kP = await text.findOne({ id: req.params.id });
    if (!kP) return res.status(404).render('./error/index', { theme: theme, errorMessage: `Could not find paste.` });
    res.render('./kaipaste/admin/add', { theme: theme, u: check_user, paste: kP });
});

a.post('/add', async function (req, res) {
    let check_user = await user.findOne({ auth_key: req.cookies.auth_key, _id: req.cookies.auth });
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    if (!check_user) return res.status(404).json({ 'OK': false, error: `Auth failed.` });
    if (check_user.userid !== "40922208590827513497") return res.status(404).json({ 'OK': false, error: `Auth failed.` });
    // ENC PASS:
    var parse_pass = crypto.enc.Utf8.parse(req.body.pass);
    var enc_pass = crypto.enc.Base64.stringify(parse_pass);
    if (check_user.pass !== enc_pass) return res.status(404).json({ "OK": false, error: `Auth failed.` });
    let kP = await text.findOne({ id: req.body.id });
    if (!kP) return res.status(404).json({ 'OK': false, error: `Could not find paste.` });
    if (!kP.removed) return res.status(404).json({ 'OK': false, error: `Paste wasnt removed.` });
    await text.updateOne({ _id: kP._id }, { $set: { removed: false } }).then(() => {
        return res.json({ 'OK': true, message: `Added paste.` });
    });
});

a.get('/:user/:id', async function (req, res) {
    let findUser = { user: req.params.user, id: req.params.id }
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    await text.findOne(findUser, async function (err, re) {
        if (err) return res.send(err);
        if (re == null) return res.render('./error/index', { errorMessage: `Could not find URL`, u: null, log: false, theme: theme });
        if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
        res.write(re.description);
        res.send();
    });
});

a.post('/:user/:id/remove', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    if (userid && username) {
        let check_user = await user.findOne({ userid: userid, user: username });
        if (check_user == null) {
            res.clearCookie("token");
            res.clearCookie("userName");
            res.redirect('/');
        } else {
            await text.findOne({ id: req.params.id, user: req.params.user, userID: userid }, async function (err, re) {
                if (err) return res.send(err);
                if (re == null) return res.status(404).render('./error/index', { errorMessage: `Could not find KaiPaste`, u: null, log: false, theme: theme });
                if (re.removed) return res.status(404).render('./error/index', { errorMessage: `KaiPaste cannot be removed again.`, u: null, log: false, theme: theme });
                await text.updateOne({ _id: re._id }, { $set: { removed: true } }).then(() => {
                    res.render('./error/index', { errorMessage: `Succesfully removed '${re.title}'.`, u: null, log: false, theme: theme });
                }).catch((e) => {
                    console.log(e)
                    res.status(500).send(`There was an error.`);
                });
            });
        }
        } else {
           res.render('./error/index', { errorMessage: `You need to be logged in to access this page.`, u: null, log: false, theme: theme });
        }
});
// This loads the edit page. This does NOT edit the actual file.
a.post('/:user/:id/edit', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    if (userid && username) {
        let check_user = await user.findOne({ userid: userid, user: username });
        if (check_user == null) {
            res.clearCookie("token");
            res.clearCookie("userName");
            res.redirect('/');
        } else {
            await text.findOne({ id: req.params.id, user: req.params.user, userID: userid }, async function (err, re) {
                if (err) return res.send(err);
                if (re == null) return res.status(404).render('./error/index', { errorMessage: `Could not find KaiPaste`, u: null, log: false, theme: theme });
                if (re.removed) return res.status(404).render('./error/index', { errorMessage: `KaiPaste cannot be removed again.`, u: null, log: false, theme: theme });
                res.render('./kaipaste/edit', { u: check_user, log: true, theme: theme, text: re });
            });
        }
        } else {
           res.render('./error/index', { errorMessage: `You need to be logged in to access this page.`, u: null, log: false, theme: theme });
        }
});
// This request makes the changes.
a.post('/:title/:id/edit-t', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    if (userid && username) {
        let check_user = await user.findOne({ userid: userid, user: username });
        if (check_user == null) {
            res.clearCookie("token");
            res.clearCookie("userName");
            res.redirect('/');
        } else {
            await text.findOne({ id: req.params.id, title: req.params.title, userID: userid, user: username }, async function (err, re) {
                if (err) return res.send(err);
                if (re == null) return res.status(404).render('./error/index', { errorMessage: `Could not find KaiPaste`, u: null, log: false, theme: theme });
                if (re.removed) return res.status(404).render('./error/index', { errorMessage: `KaiPaste cannot be removed again.`, u: null, log: false, theme: theme });
                await text.updateOne({ _id: re._id }, { $set: { description: `${req.body.text}` } }).then(() => {
                    res.redirect('/kaipaste/' + re.id);
                });
            });
        }
        } else {
           res.render('./error/index', { errorMessage: `You need to be logged in to access this page.`, u: null, log: false, theme: theme });
        }
});

module.exports = a;
