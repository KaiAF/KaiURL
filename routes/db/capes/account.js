const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    uuid: String,
    capeId: String,
    Id: String,
    password: String,
    code: String,
    linkedUser: String,
    linked: Boolean
});

module.exports = mongoose.model('mcmCapes-account', userSchema);