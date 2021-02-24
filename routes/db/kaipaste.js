const mongoose = require('mongoose');

const shorturlSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String,
    date: Date,
    user: String,
    userID: String,
    removed: Boolean
});

module.exports = mongoose.model('texts', shorturlSchema);
