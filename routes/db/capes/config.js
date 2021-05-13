const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    uuid: String,
    enabled: Boolean
});

module.exports = mongoose.model('mcmConfig', userSchema);