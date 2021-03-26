const a = require('express').Router();
const multer = require('multer');
const gridFS = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');

const blockedName = require('../db/blockedName');
const user = require('../db/user');
const pvurl = require('../db/pUrl');

var conn = mongoose.connection;
conn.once('open', async function() {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('kaiurlImages');
});

a.get('/:name', async function (req, res) {
    let userid = req.cookies.token;
    let username = req.cookies.userName;
    let theme = req.cookies.Theme;
    let check_login;
    if (!theme) theme = null;
    if (!userid) check_login = null;
    if (!username) check_login = null;
    if (username && userid) check_login = await user.findOne({ user: username, userid: userid }); // Checks if the user is logged in when loading profile. If they are, it shows "edit account".
    let bName = req.params.name.toUpperCase();
    await blockedName.findOne({ title: 'list' }, async (err, ree) => {
        if (err) return res.send(err);
        if (ree) {
            try {
                    let clientSide = ree
                    await user.findOne({ user: req.params.name }, async function (err, re) {
                        if (err) return res.send(err);
                            if (re == null) {
                                // This allows search by Id
                                await user.findOne({ userid: req.params.name }, async function (err, re) {
                                    if (err) return res.send(err);
                                    if (re == null) return res.status(404).render('./error/index', { errorMessage: `Could not find user.`, theme: theme, u: null });
                                    let image = await gfs.files.findOne({ filename: `${re.userid}-${re._id}.png` });
                                    
                                    let user_urls = await pvurl.find({ userID: re.userid });
                                    
                                    if (check_login) {
                                    if (check_login.user === username && check_login.userid === userid) {
                                        res.render('./account/pubProfile', { u: check_login, theme: theme, user: re, Name: clientSide, uUrl: user_urls, image: image });
                                    }} else {
                                        res.render('./account/pubProfile', { u: null, theme: theme, user: re, Name: clientSide, uUrl: user_urls, image: image });
                                    }
                                });
                            } else {
                            let image = await gfs.files.findOne({ filename: `${re.userid}-${re._id}.png` });
                            let user_urls = await pvurl.find({ userID: re.userid });
                            if (check_login) {
                                if (check_login.user === username && check_login.userid === userid) {
                                    res.render('./account/pubProfile', { u: check_login, theme: theme, user: re, Name: clientSide, uUrl: user_urls, image: image });
                                }} else {
                                    res.render('./account/pubProfile', { u: null, theme: theme, user: re, Name: clientSide, uUrl: user_urls, image: image });
                                }
                        }
                        });
                    } catch {
                return res.status(500).send('There was an error in the blocked name feature! ' + req.baseUrl + '. Contact the developer if this continues to happen.');
            }
        }
    });
});

module.exports = a;