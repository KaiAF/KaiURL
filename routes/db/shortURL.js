const mongoose = require('mongoose');
const config = require('../config.json');

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

if (config.Url === "https://beta.kaiurl.xyz") {
    module.exports = mongoose.model('new_shorturl', shorturlSchema);
} else {
    module.exports = mongoose.model('shorturl', shorturlSchema);
}
