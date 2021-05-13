const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    userid: String,
    status: String,
    guildId: String
});

module.exports = mongoose.model('kaiurlchatrooms-user-status', userSchema);