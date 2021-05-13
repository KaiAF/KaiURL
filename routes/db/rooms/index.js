const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    guildName: String,
    guildId: String,
    guildOwner: String,
    members: Array
});

module.exports = mongoose.model('kaiurlchatrooms', userSchema);