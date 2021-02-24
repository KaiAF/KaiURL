const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    title: String,
    name: Array
});

module.exports = mongoose.model('blockedName', userSchema);
