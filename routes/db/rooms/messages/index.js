const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    guildId: String,
    user: String,
    userId: String,
    avatar: Boolean,
    messageId: String,
    message: String
});

module.exports = mongoose.model('kaiurlchatrooms-message', userSchema);