/*
    let now = new Date();
    console.log(now);

    now.SubtractMinutes(10);
    console.log(now);
*/

function sub(t) {
    Date.prototype.SubtractMinutes = function (m) {
        m = m ? m : 0;
        this.setMinutes(this.getMinutes() - m);
        return this;
    }

    let now = new Date();
    return now.SubtractMinutes(t);
};

function add(t) {
    Date.prototype.SubtractMinutes = function (m) {
        m = m ? m : 0;
        this.setMinutes(this.getMinutes() + m);
        return this;
    }

    let now = new Date();
    return now.SubtractMinutes(t);
}

module.exports = {sub, add}