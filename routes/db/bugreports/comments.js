const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    author: String,
    authorId: String,
    reportId: String,
    comment: String,
    date: Date,
    commentId: String,
    removed: Boolean
});

module.exports = mongoose.model('bug-report-comment', userSchema);