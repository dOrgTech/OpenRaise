// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const lib = require('zos-lib');

const helpers = require('../testHelpers');

const StaticCurveLogic = artifacts.require('StaticCurveLogic');

contract('StaticCurveLogic', ([sender, receiver, testAccount]) => {
  let tx;
  let result;

  const TEN = new BN(10);

  // Ratio of send tokens to minted tokens = tokenRatio / PRECISION
  const precision = new BN(1000000);
  const tokenRatio = new BN(100000000);

  let values = {
    a: {
      totalSupply: new BN(1),
      reserveBalance: new BN(1),
      amount: new BN(1)
    },
    b: {
      totalSupply: new BN('1000000'),
      reserveBalance: new BN('1000000'),
      amount: new BN('1000000')
    },
    c: {
      totalSupply: new BN(Math.pow(1, 20)),
      reserveBalance: new BN('1000000000000000000'),
      amount: new BN('1000000000000000000')
    }
  };

  beforeEach(async function() {
    const curveAddress = await helpers.appCreate(
      helpers.constants.BC_DAO_PACKAGE,
      helpers.constants.STATIC_CURVE_LOGIC,
      constants.ZERO_ADDRESS,
      helpers.encodeCall('initialize', ['uint256'], [tokenRatio.toString()])
    );

    this.curve = await StaticCurveLogic.at(curveAddress);
  });

  it('should set parameter correctly', async function() {
    result = await this.curve.tokenRatio();
    expect(result).to.be.bignumber.equal(tokenRatio);
  });

  it('calculate correct buy result for value set A', async function() {
    result = await this.curve.calcMintPrice(
      values.a.totalSupply,
      values.a.reserveBalance,
      values.a.amount
    );

    expect(result).to.be.bignumber.equal(tokenRatio.mul(values.a.amount).div(precision));
  });

  it('calculate correct buy result for value set B', async function() {
    result = await this.curve.calcMintPrice(
      values.b.totalSupply,
      values.b.reserveBalance,
      values.b.amount
    );

    expect(result).to.be.bignumber.equal(tokenRatio.mul(values.b.amount).div(precision));
  });

  it('calculate correct buy result for value set C', async function() {
    result = await this.curve.calcMintPrice(
      values.c.totalSupply,
      values.c.reserveBalance,
      values.c.amount
    );

    expect(result).to.be.bignumber.equal(tokenRatio.mul(values.c.amount).div(precision));
  });

  it('calculate correct sell result for value set A', async function() {
    result = await this.curve.calcBurnReward(
      values.a.totalSupply,
      values.a.reserveBalance,
      values.a.amount
    );

    expect(result).to.be.bignumber.equal(tokenRatio.mul(values.a.amount).div(precision));
  });

  it('calculate correct sell result for value set B', async function() {
    result = await this.curve.calcBurnReward(
      values.b.totalSupply,
      values.b.reserveBalance,
      values.b.amount
    );

    expect(result).to.be.bignumber.equal(tokenRatio.mul(values.b.amount).div(precision));
  });

  it('calculate correct sell result for value set C', async function() {
    result = await this.curve.calcBurnReward(
      values.c.totalSupply,
      values.c.reserveBalance,
      values.c.amount
    );

    expect(result).to.be.bignumber.equal(tokenRatio.mul(values.c.amount).div(precision));
  });
});
