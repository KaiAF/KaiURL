const express = require('express');
const a = require('express').Router();
const app = express();
const mongo = require('mongoose');
const fetch = require('node-fetch');
const env = require('dotenv').config();
const path = require('path');

const shorturl = require('./routes/db/shortURL');
const user = require('./routes/db/user');
const pvurl = require('./routes/db/pUrl');
const blockedName = require('./routes/db/blockedName');
const config = require('./routes/config.json');

console.clear();
// Mongoose Database. You would need to configure your own Mongo URI.
mongo.connect(
    process.env.MONGODB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }).catch(err => {
        console.log('There was an error while trying to connect to the DataBase.')
});

app.set('view engine', "ejs");
app.use(require("cookie-parser")());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api', require('./routes/api/index')); // Private information. Everything in there will not be public. Essentially just log in and register stuff.
app.use('/account', require('./routes/account/index')); // Account Dashboard.
app.use('/r', require('./routes/redirect/index')); // Redirects.
app.use('/shrink', require('./routes/shrink/index')); // Creating the short url.
app.use('/kaipaste', require('./routes/kaipaste/index')); // KaiPaste. Like pastebin, but worse.
app.use('/user', require('./routes/account/user')); // This will display the users Profile.
app.use('/img', require('./routes/account/avatar')); // Avatar route.
app.use('/passwordReset', require('./routes/resetP/index'));
app.use('/support', require('./routes/support/index')); // Bug reports.
app.use('/changelog', require('./routes/changelog/index')); // Changelogs!
app.use(checkUser); // This function is there to check if the user is logged in or not.
app.use(express.static('public')); // Public code. Like the script files.

// A function to check if the user is logged in or not.

async function checkUser(req, res, next) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let authKey = req.cookies.auth_key;
    if (userid && username && authKey) {
       await user.findOne({ userid: userid, officialName: username.toUpperCase(), auth_key: authKey }, (err, re) => {
            if (err) return res.send(err);
            if (re == null) {
                clearCookie(req,res,next());
            }
            if (re) {
                if (re.auth_key === authKey) {
                    res.cookie("auth", re._id); // The user's mongo Id.
                    next();
                } else {
                    clearCookie(req,res,next());
                }
            };
        }).catch(e => {
            console.log(e)
            clearCookie(req,res,next());
        });
    } else {
        clearCookie(req,res,next());
    }
};

a.get('/', async function (req, res, next) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
      let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
          res.render('./home/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./home/index', { u: null, log: false, theme: theme });
    }
});

a.get('/u', async function (req,res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    let url = await shorturl.find().sort({ date: -1 });
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./u/index', { r: url, u: check_user, log: true, theme: theme });
    } else {
        res.render('./u/index', { r: url, u: null, log: false, theme: theme });
    }
});

// Log in / Register

a.get('/login', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./login/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./login/index', { u: null, log: false, theme: theme });
    }
});

a.get('/register', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./register/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./register/index', { u: null, log: false, theme: theme });
    }
});

a.get('/logout', (req, res) => {
    clearCookie(req,res);
    return res.redirect('/');
});

// Uninportant pages

a.get('/contact', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./contact/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./contact/index', { u: null, log: false, theme: theme });
    }
});

a.get('/tos', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./tos/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./tos/index', { u: null, log: false, theme: theme });
    }
});

a.get('/about', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./about/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./about/index', { u: null, log: false, theme: theme });
    }
});

a.get('/credit', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./credit/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./credit/index', { u: null, log: false, theme: theme });
    }
});

a.get('/copyright', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let auth = req.cookies.auth;
    if (auth) {
        let check_user = await user.findOne({ _id: auth, userid: req.cookies.token }).catch(e => { return res.redirect('/logout') })
        res.render('./copyright/index', { u: check_user, log: true, theme: theme });
    } else {
        res.render('./copyright/index', { u: null, log: false, theme: theme });
    }
});

// Redirect to FullURL

a.get('/:id', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    await shorturl.findOne({ short: req.params.id }, async (err, re) => {
        if (err) return res.send(err);
        if (re == null) return res.render('./error/index', { errorMessage: `Could not find the page you were looking for..`, u: null, log: false, theme: theme })
        if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
        let Click = re.clicks;
        let uClick = ++Click;
        await shorturl.updateOne({ short: req.params.id }, { clicks: uClick }).then(() => {
            res.redirect(re.full);
        });
    });
});

// Redirect Private URLs

a.get('/:Name/:id', async function (req, res) {
    let theme = req.cookies.Theme;
    if (!theme) theme = null;
    let check_user = await user.findOne({ user: req.params.Name });
    if (check_user == null) return res.render('./error/index', { errorMessage: `Could not find the page you were looking for..`, u: null, log: false, theme: theme })
    await pvurl.findOne({ short: req.params.id, userID: check_user.userid }, async (err, re) => {
        if (err) return res.send(err);
        if (re == null) return res.render('./error/index', { errorMessage: `Could not find the page you were looking for..`, u: null, log: false, theme: theme })
        if (re.removed) return res.render('./error/index', { errorMessage: `This URL was removed.`, u: null, log: false, theme: theme });
        let Click = re.clicks;
        let uClick = ++Click;
        await shorturl.updateOne({ short: req.params.id }, { clicks: uClick }).then(() => {
            res.redirect(re.full);
        });
    });
});

function clearCookie(req, res, next) {
    res.clearCookie("auth")
    res.clearCookie("token")
    res.clearCookie("userName")
    res.clearCookie("auth_key")
    res.cookie("auth", "000000000000000000000000"); // Auth Id is set to all zeros as it would crash if it was set to null. Weird.
    next
}

app.use('/', a);
app.listen(process.env.PORT || 80, function () {
    console.log(`Website On`);
});
