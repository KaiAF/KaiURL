const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    title: String,
    description: String,
    version: String,
    date: Date,
    Id: String
});

module.exports = mongoose.model('changelog', userSchema);
