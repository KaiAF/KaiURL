const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user: String,
    hideUrls: Boolean,
    hideRole: Boolean,
    hideDiscord: Boolean
});

module.exports = mongoose.model('userPrivacy', userSchema);