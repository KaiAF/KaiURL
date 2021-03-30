const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    key: String
});

module.exports = mongoose.model('apiKey', userSchema);

/* This is all the data that is being stored in the database. */