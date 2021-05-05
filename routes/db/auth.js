const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    auth: String,
    Id: String
});

module.exports = mongoose.model('userAuth', userSchema);