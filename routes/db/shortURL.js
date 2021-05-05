const mongoose = require('mongoose');
const config = require('../config.json');

const shorturlSchema = new mongoose.Schema({
    full: String,
    short: String,
    clicks: Number,
    verified: Boolean,
    removed: Boolean,
    date: Date
});

module.exports = mongoose.model('shorturl', shorturlSchema);
