const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    date: Date,
    user: String,
    uuid: String,
    ears: String,
    cfg: Object,
    earId: String
});

module.exports = mongoose.model('mcmCapes-ears', userSchema);