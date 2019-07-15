const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("openzeppelin-test-helpers");

// Import preferred chai flavor: both expect and should are supported
const expect = require("chai").expect;
const should = require("chai").should();
const lib = require("zos-lib");

const {
  appCreate,
  getAppAddress,
  encodeCall,
  getZosConfig,
  getCurrentZosNetworkConfig
} = require("../testHelpers");

const PaymentToken = artifacts.require("StandaloneERC20");
const DividendToken = artifacts.require("DividendToken");
const DividendPaymentTracker = artifacts.require("DividendPaymentTracker");
const App = artifacts.require("App");

contract("DividendToken", accounts => {
  let tx;
  let result;

  let values = {
    paymentToken: {
      name: "PaymentToken",
      symbol: "PAY",
      decimals: new BN(18)
    },
    dividendToken: {
      name: "BondedToken",
      symbol: "BND",
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

    const dividendTokenAddress = await appCreate(
      "bc-dao",
      "DividendToken",
      constants.ZERO_ADDRESS,
      encodeCall(
        "initialize",
        ["string", "string", "uint8", "address", "address", "bool"],
        [
          values.dividendToken.name,
          values.dividendToken.symbol,
          values.dividendToken.decimals.toNumber(),
          values.dividendToken.controller,
          this.paymentToken.address,
          values.dividendToken.transfersEnabled
        ]
      )
    );

    this.dividendToken = await DividendToken.at(dividendTokenAddress);
  });

  it("should register payment correctly", async function() {
    const dividendTokenOwner = accounts[0];
    const sender = accounts[1];

    const amount = new BN(1000000000);

    tx = await this.paymentToken.approve(this.dividendToken.address, amount, {
      from: sender
    });

    result = await this.paymentToken.allowance(
      sender,
      this.dividendToken.address
    );
    console.log("allowance", result.toNumber());

    await this.dividendToken.mint(sender, amount, {
      from: dividendTokenOwner
    });

    result = await this.dividendToken.balanceOf(sender);
    console.log("balanceOf", result.toNumber());

    result = await this.dividendToken.totalSupply();
    console.log("totalSupply", result.toNumber());

    tx = await this.dividendToken.registerPayment(amount, {
      from: sender
    });
    console.log(1);
    //Check event
    expectEvent.inLogs(tx.logs, "PaymentRegistered", {
      from: sender,
      token: this.paymentToken.address,
      amount: amount
    });
    //Check value
  });
  it("should allow Valid user to withdraw dividend for a single payment", async function() {});
  it("should not allow Invalid user should to withdraw dividend for a single payment", async function() {});
  it("should allow User who sold tokens to withdraw dividends for a previous payment", async function() {});
  it("should not allow User who sold tokens to withdraw dividends for a subsequent payment", async function() {});
  it("should allow Valid user to withdraw dividends for multiple payments", async function() {});
  it("should not allow Invalid user to withdraw dividends for multiple payments", async function() {});
  it("should allow many payments and withdrawals with one user", async function() {});
  it("should allow many payments and withdrawals with one user", async function() {});
  it("should User who previously sold tokens should be able to withdraw dividends for previous payments", async function() {});
});
