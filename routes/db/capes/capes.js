const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    uuid: String,
    cape: String,
    capeId: String,
    linked: Boolean,
    cfg: Object
});

module.exports = mongoose.model('mcmCapes-user', userSchema);