const user = require('./db/user');
async function checkPerm(account) {
    let msg;
    let checkUser = await user.findOne({ userid: account });

    if (!checkUser) return null;
    if (checkUser.perms == "OWNER") msg = "ADMIN";
    if (checkUser.perms == "ADMIN") msg = "ADMIN";
    if (checkUser.perms == "MOD") msg = "MOD";
    if (checkUser.perms == "BUG-HUNTER") msg = "BUG-HUNTER";
    if (checkUser.perms == null) msg = "MEMBER";

    return msg;
}


module.exports = {
    checkPerm
}