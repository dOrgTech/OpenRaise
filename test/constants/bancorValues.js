const {BN} = require('openzeppelin-test-helpers');

module.exports.values = [
  {
    supply: 1,
    connectorBalance: 1,
    connectorWeight: 1000,
    depositAmount: 1,
    expectedBuyResult: new BN(0),
    expectedSaleResult: new BN(1)
  },
  {
    supply: 1000000,
    connectorBalance: 10000,
    connectorWeight: 1000,
    depositAmount: 10000,
    expectedBuyResult: new BN(693),
    expectedSaleResult: new BN(9999)
  },
  {
    supply: 100000000,
    connectorBalance: 1000000,
    connectorWeight: 1000,
    depositAmount: 10000,
    expectedBuyResult: new BN(995),
    expectedSaleResult: new BN(95167)
  }
];
