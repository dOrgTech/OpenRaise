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
const DividendPool = artifacts.require('DividendPool');
const App = artifacts.require('App');

contract('DividendPool', accounts => {
  let tx;
  let result;
  let initialBlockNumber;

  let values = {
    paymentToken: {
      name: 'PaymentToken',
      symbol: 'PAY',
      decimals: new BN(18)
    }
  };

  let payments = [
    {
      payee: accounts[2],
      amount: 10
    },
    {
      payee: accounts[3],
      amount: 12
    },
    {
      payee: accounts[4],
      amount: 2
    },
    {
      payee: accounts[5],
      amount: 1
    },
    {
      payee: accounts[6],
      amount: 32
    },
    {
      payee: accounts[7],
      amount: 10
    },
    {
      payee: accounts[8],
      amount: 9
    },
    {
      payee: accounts[9],
      amount: 101 // this amount is used to test logic when the payment pool doesn't have sufficient funds
    }
  ];

  const appAddress = getAppAddress();

  beforeEach(async function() {
    this.app = await App.at(appAddress);

    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals
    );

    const dividendPoolAddress = await appCreate(
      'bc-dao',
      'DividendPool',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['address', 'address'], [this.paymentToken.address, accounts[0]])
    );

    this.dividendPool = await DividendPool.at(dividendPoolAddress);

    initialBlockNumber = await web3.eth.getBlockNumber();
  });

  afterEach(async function() {
    // one of the tests is bleeding state...
    payments[0].amount = 10;
  });

  it('should register payment correctly', async function() {});
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
