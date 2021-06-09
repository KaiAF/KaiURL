const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    uuid: String,
    capeId: String,
    Id: String,
    password: String
});

module.exports = mongoose.model('mcmCapes-account', userSchema);