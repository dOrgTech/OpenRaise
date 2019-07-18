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

const PaymentToken = artifacts.require('StandaloneERC20');
const BondedToken = artifacts.require('BondedToken');
const BondingCurve = artifacts.require('BondingCurve');
const BancorCurveLogic = artifacts.require('BancorCurveLogic');
const App = artifacts.require('App');

contract('MarketMaker', accounts => {
  let tx;
  let result;

  let values = {
    paymentToken: {
      name: 'PaymentToken',
      symbol: 'PAY',
      decimals: new BN(18)
    },
    claimsToken: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: new BN(18),
      controller: accounts[0],
      paymentToken: null,
      transfersEnabled: true
    }
  };

  const appAddress = getAppAddress();

  beforeEach(async function() {
    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals
    );

    const claimsTokenAddress = await appCreate(
      'bc-dao',
      'BondedToken',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['string', 'string', 'uint8', 'address', 'bool'],
        [
          values.claimsToken.name,
          values.claimsToken.symbol,
          values.claimsToken.decimals.toNumber(),
          values.claimsToken.controller,
          values.claimsToken.transfersEnabled
        ]
      )
    );

    this.claimsToken = await BondedToken.at(claimsTokenAddress);

    const buyCurveAddress = await appCreate(
      'bc-dao',
      'BancorCurveLogic',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['uint32'], [1000])
    );

    this.buyCurve = await BancorCurveLogic.at(buyCurveAddress);

    const sellCurveAddress = await appCreate(
      'bc-dao',
      'BancorCurveLogic',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['uint32'], [500])
    );

    this.sellCurve = await BancorCurveLogic.at(sellCurveAddress);

    const bondingCurveAddress = await appCreate(
      'bc-dao',
      'BondingCurve',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['address', 'address', 'address', 'address', 'address', 'address', 'uint256'],
        [
          this.paymentToken.address,
          accounts[0],
          accounts[0],
          this.buyCurve.address,
          this.sellCurve.address,
          this.claimsToken.address,
          new BN(50).toNumber()
        ]
      )
    );

    this.bondingCurve = await BondingCurve.at(bondingCurveAddress);
  });

  it('should have properly initialized parameters', async function() {
    //Initial payment array is empty
    //PaymentToken address is correct
    //BondedToken address is correct
  });

  it('should allow New user to buy tokens', async function() {
    tx = await this.bondingCurve.buy(1000, 1000, accounts[1], {
      from: accounts[1]
    });

    result = await this.claimsToken.balanceOf(accounts[1]);
    expect(result).to.be.bignumber.equal(new BN(0));
  });

  it('should allow New user to buy for a different recipient', async function() {
    tx = await this.bondingCurve.buy(1000, 1000, accounts[2], {
      from: accounts[1]
    });

    result = await this.claimsToken.balanceOf(accounts[1]);
    expect(result).to.be.bignumber.equal(new BN(0));
    result = await this.claimsToken.balanceOf(accounts[2]);
    expect(result).to.be.bignumber.equal(new BN(0));
  });

  it('should allow Beneficiary to buy tokens', async function() {});

  it('should give Beneficiary correct split on buy', async function() {});

  it('should allow Existing user to buy tokens', async function() {});

  it('should allow Existing user to buy tokens', async function() {});

  it('should send correct value to reserve on buy', async function() {});

  it('should correctly set number of payments made', async function() {});

  // TODO: Handle sell logic once sell mechanics are finalized
});
