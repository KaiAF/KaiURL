const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    date: Date,
    title: String,
    body: String,
    comments: String,
    user: String,
    id: String
});

module.exports = mongoose.model('kaiurlnews', userSchema);