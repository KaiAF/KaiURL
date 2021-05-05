const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    user: String,
    Id: String,
    discordId: String,
    discordName: String,
    discordDisc: String,
    linkDate: Date,
    logId: String,
    callbackCode: String,
    linked: Boolean,
    unlinkedDate: Date
});

module.exports = mongoose.model('kaiurlDiscordMergeLog', userSchema);