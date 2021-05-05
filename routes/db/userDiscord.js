const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    userId: String,
    userDisc: String,
    avatarHash: String,
    verified: Boolean,
    premiumType: Number,
    email: String,
    mfa: Boolean,
    lastUpdated: Date
});

module.exports = mongoose.model('userDiscord', userSchema);