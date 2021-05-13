const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    userid: String,
    liked: String,
    messageId: String
});

module.exports = mongoose.model('kaiurlnews-like', userSchema);