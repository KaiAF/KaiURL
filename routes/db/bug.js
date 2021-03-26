const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    title: String,
    description: String,
    reproduce: String,
    bugId: String,
    date: Date,
    userId: String,
    status: String,
    comment: Array
});

module.exports = mongoose.model('bug-report', userSchema);
