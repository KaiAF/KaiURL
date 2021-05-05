const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    id: String,
    news: String,
    comment: String
});

module.exports = mongoose.model('kaiurlnews-comment', userSchema);