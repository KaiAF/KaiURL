const mongoose = require('mongoose');

const shorturlSchema = new mongoose.Schema({
    full: String,
    short: String,
    clicks: Number,
    verified: Boolean,
    removed: Boolean,
    date: Date,
    userID: String
});

module.exports = mongoose.model('privateurls', shorturlSchema);
