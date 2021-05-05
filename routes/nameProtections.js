const blocked_names = require('./db/blockedName');


async function checkName(name) {
    let status;
    if (!name || name.indexOf(' ') >= 0) status = null;
    await blocked_names.findOne({ title: 'list' }, async function (err, r) {
        if (err) status = null; console.log(err);
        if (!r) status = null;
        if (r) {
            if (r.name.includes(name)) status = true;
            if (!r.name.includes(name)) status = null;
        };
    });
    return status;
};

module.exports = {
    checkName
}