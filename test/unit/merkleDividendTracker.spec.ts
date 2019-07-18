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
const DividendPaymentTracker = artifacts.require('DividendPaymentTracker');
const App = artifacts.require('App');

contract('BondedToken', accounts => {
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
    this.app = await App.at(appAddress);

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

    const dividendTrackerAddress = await appCreate(
      'bc-dao',
      'DividendPaymentTracker',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['address', 'address'],
        [this.paymentToken.address, this.claimsToken.address]
      )
    );

    this.dividendTracker = await DividendPaymentTracker.at(dividendTrackerAddress);
  });

  it('should register payment correctly', async function() {
    const claimsTokenOwner = accounts[0];
    const sender = accounts[1];

    const amount = new BN(1000000000);

    tx = await this.paymentToken.approve(this.dividendTracker.address, amount, {
      from: sender
    });

    result = await this.paymentToken.allowance(sender, this.dividendTracker.address);
    console.log('allowance', result.toNumber());

    await this.claimsToken.mint(sender, amount, {
      from: claimsTokenOwner
    });

    result = await this.claimsToken.balanceOf(sender);
    console.log('balanceOf', result.toNumber());

    result = await this.claimsToken.totalSupply();
    console.log('totalSupply', result.toNumber());

    tx = await this.dividendTracker.pay(amount, {
      from: sender
    });
    console.log(1);
    //Check event
    expectEvent.inLogs(tx.logs, 'PaymentRegistered', {
      from: sender,
      token: this.paymentToken.address,
      amount: amount
    });
    //Check value
  });
  it('should allow DAO to publish valid root', async function() {});
  it('should not allow DAO to publish invalid root', async function() {});

  it('should not allow any other address to publish valid root', async function() {});
  it('should not allow any other address to publish invalid root', async function() {});

  it('should allow Valid user to withdraw dividend for a single payment', async function() {});
  it('should not allow Invalid user should to withdraw dividend for a single payment', async function() {});
  it('should allow User who sold tokens to withdraw dividends for a previous payment', async function() {});
  it('should not allow User who sold tokens to withdraw dividends for a subsequent payment', async function() {});
  it('should allow Valid user to withdraw dividends for multiple payments', async function() {});
  it('should not allow Invalid user to withdraw dividends for multiple payments', async function() {});
  it('should allow many payments and withdrawals with one user', async function() {});
  it('should allow many payments and withdrawals with one user', async function() {});
  it('should User who previously sold tokens should be able to withdraw dividends for previous payments', async function() {});
});
