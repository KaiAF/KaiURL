const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    officialName: String,
    officialEmail: String,
    userid: String,
    user: String,
    pass: String,
    email: String,
    authToken: String,
    discriminator: String,
    joinDate: Date,
    verified: Boolean,
    nickname: String,
    twitter: String,
    youtube: String,
    reddit: String,
    discord: String,
    glimesh: String,
    description: String,
    auth_key: String,
    role: String,
    passwordReset: Boolean,
    sinceLastReset: String,
    resetId: String,
    ifDiscord: Boolean,
    perms: String
});

module.exports = mongoose.model('userpasses', userSchema);
