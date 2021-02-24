const mongoose = require('mongoose');

const shorturlSchema = new mongoose.Schema({
    full: String,
    short: String,
    clicks: Number,
    official: Boolean,
    removed: Boolean,
    date: Date,
    user: String,
    Domain: {
        type: String,
        default: "kaiurl.xyz"
    },
    userID: String
});

module.exports = mongoose.model('privateurls', shorturlSchema);
