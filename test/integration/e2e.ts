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

const PaymentToken = artifacts.require('StandaloneERC20');
const BondedToken = artifacts.require('BondedToken');
const BondingCurve = artifacts.require('BondingCurve');
const BancorCurveLogic = artifacts.require('BancorCurveLogic');
const App = artifacts.require('App');

contract('e2e Flow', ([sender, receiver, testAccount]) => {
  let tx;

  let values = {
    paymentToken: {
      name: 'PaymentToken',
      symbol: 'PAY',
      decimals: new BN(18)
    },
    bondedToken: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: new BN(18),
      controller: sender
    }
  };

  const appAddress = getAppAddress();

  beforeEach(async function() {
    this.app = await App.at(appAddress);

    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals
    );

    const bondedTokenAddress = await appCreate(
      'bc-dao',
      'BondedToken',
      receiver,
      encodeCall(
        'initialize',
        ['string', 'string', 'uint8', 'address', 'bool'],
        [
          values.bondedToken.name,
          values.bondedToken.symbol,
          values.bondedToken.decimals.toNumber(),
          values.bondedToken.controller,
          values.bondedToken.transfersEnabled
        ]
      )
    );

    this.bondedToken = await BondedToken.at(bondedTokenAddress);

    const buyCurveAddress = await appCreate(
      'bc-dao',
      'BancorCurveLogic',
      receiver,
      encodeCall('initialize', ['uint32'], [1000])
    );

    this.buyCurve = await BancorCurveLogic.at(buyCurveAddress);

    const sellCurveAddress = await appCreate(
      'bc-dao',
      'BancorCurveLogic',
      receiver,
      encodeCall('initialize', ['uint32'], [500])
    );

    this.sellCurve = await BancorCurveLogic.at(sellCurveAddress);

    const bondingCurveAddress = await appCreate(
      'bc-dao',
      'BondingCurve',
      receiver,
      encodeCall(
        'initialize',
        ['address', 'address', 'address', 'address', 'address', 'address', 'uint256'],
        [
          this.paymentToken.address,
          sender,
          sender,
          this.buyCurve.address,
          this.sellCurve.address,
          this.bondedToken.address,
          new BN(50).toNumber()
        ]
      )
    );

    this.bondingCurve = await BondingCurve.at(bondingCurveAddress);
  });

  it('should properly complete e2e flow', async function() {
    // Deploy a new ecosystem
    // Users buy tokens
    // Users sell tokens
    // Users trade tokens
    // Payments come in
    // Merkle root is calculated & published
    // Users try to withdraw
    // More users buy / sell / trade tokens
    // More payments + merkle publish
  });
});
