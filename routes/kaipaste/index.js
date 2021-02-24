const a = require('express').Router();

const text = require('../db/kaipaste');
const user = require('../db/user');

a.get('/', async function (req, res) {
    res.send('Hello');
});

a.get('/:id', async function (req, res) {
    await text.findOne({ id: req.params.id }, async function (err, re) {
        if (err) return res.send(err);
        if (re == null) return res.render('./error/index', { errorMessage: `Could not find URL`, u: null, log: false, theme: theme });
        if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
        res.write(re.description);
        res.send();
    });
});

a.get('/:user/:id', async function (req, res) {
    let findUser = { user: req.params.user, id: req.params.id }
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