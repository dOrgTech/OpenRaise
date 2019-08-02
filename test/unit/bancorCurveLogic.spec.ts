// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const lib = require('zos-lib');

const {
  appCreate,
  getAppAddress,
  encodeCall,
  getZosConfig,
  getCurrentZosNetworkConfig
} = require('../testHelpers');

const BancorCurveLogic = artifacts.require('BancorCurveLogic');
const BancorCurveService = artifacts.require('BancorCurveService');

contract('BancorCurveLogic', ([sender, receiver, testAccount]) => {
  let tx;

  let curve;
  let bancorCurveService;

  let values = {
    a: {
      supply: 1,
      connectorBalance: 1,
      connectorWeight: 1000,
      depositAmount: 1,
      expectedResult: new BN(0)
    },
    b: {
      supply: 1000000,
      connectorBalance: 10000,
      connectorWeight: 1000,
      depositAmount: 10000,
      expectedResult: new BN(693)
    },
    c: {
      supply: 100000000,
      connectorBalance: 1000000,
      connectorWeight: 1000,
      depositAmount: 10000,
      expectedResult: new BN(995)
    }
  };

  beforeEach(async function() {
    bancorCurveService = await BancorCurveService.at(
      await appCreate('bc-dao', 'BancorCurveService', constants.ZERO_ADDRESS, '0x')
    );

    await bancorCurveService.initialize();

    curve = await BancorCurveLogic.at(
      await appCreate('bc-dao', 'BancorCurveLogic', constants.ZERO_ADDRESS, '0x')
    );

    await curve.initialize(bancorCurveService.address, 1000);
  });

  it('calculate correct buy result for value set A', async function() {
    const result = await curve.calcMintPrice(
      values.a.supply,
      values.a.connectorBalance,
      values.a.depositAmount
    );

    expect(result).to.be.bignumber.equal(values.a.expectedResult);
  });

  it('calculate correct buy result for value set B', async function() {
    const result = await curve.calcMintPrice(
      values.b.supply,
      values.b.connectorBalance,
      values.b.depositAmount
    );

    expect(result).to.be.bignumber.equal(values.b.expectedResult);
  });

  it('calculate correct buy result for value set C', async function() {
    const result = await curve.calcMintPrice(
      values.c.supply,
      values.c.connectorBalance,
      values.c.depositAmount
    );

    expect(result).to.be.bignumber.equal(values.c.expectedResult);
  });
});
