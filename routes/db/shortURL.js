const mongoose = require('mongoose');

const shorturlSchema = new mongoose.Schema({
    full: String,
    short: String,
    clicks: Number,
    official: Boolean,
    removed: Boolean,
    date: Date,
    Domain: {
        type: String,
        default: "kaiurl.xyz"
    },
    user: {
        type: String,
        required: false,
        default: 'unknown'
    }
});

module.exports = mongoose.model('shorturl', shorturlSchema);
