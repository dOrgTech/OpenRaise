const {BN} = require('openzeppelin-test-helpers');

module.exports = {
  bondingCurve: {
    tokenRatioPrecision: new BN(1000000),
    microPaymentsThreshold: new BN(100)
  }
};
