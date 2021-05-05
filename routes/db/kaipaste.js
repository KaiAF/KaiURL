const mongoose = require('mongoose');

const shorturlSchema = new mongoose.Schema({
    user: String,
    title: String,
    description: String,
    removed: Boolean,
    id: String,
    date: Date
});

module.exports = mongoose.model('texts', shorturlSchema);
