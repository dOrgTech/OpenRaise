const {BN} = require('openzeppelin-test-helpers');

const str = (val) => {
    return val.toString();
}

const bn = val => {
    return new BN(val.toString());
}

module.exports = {
    str, bn
}