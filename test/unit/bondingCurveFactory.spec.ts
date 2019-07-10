// Import all required modules from openzeppelin-test-helpers
const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("openzeppelin-test-helpers");

// Import preferred chai flavor: both expect and should are supported
const { expect } = require("chai");

const {
  appCreate,
  getAppAddress,
  encodeCall,
  getZosConfig,
  getCurrentZosNetworkConfig
} = require("../testHelpers");

const PaymentToken = artifacts.require("StandaloneERC20");
const DividendToken = artifacts.require("DividendToken");
const BondingCurve = artifacts.require("BondingCurve");
const BancorCurveLogic = artifacts.require("BancorCurveLogic");

const CombinedFactory = artifacts.require("CombinedFactory");

contract("BondingCurveFactory", ([sender, receiver]) => {
  let tx;

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
      controller: sender,
      paymentToken: null,
      transfersEnabled: true
    }
  };

  beforeEach(async function() {
    const appAddress = getAppAddress();

    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals
    );

    this.combinedFactory = await CombinedFactory.new();
    this.combinedFactory.initialize(appAddress);
  });

  it("emits Created event on combined deploy", async function() {
    tx = await this.combinedFactory.deploy(
      "BondedToken",
      "BND",
      18,
      sender,
      1000,
      500,
      this.paymentToken.address,
      40,
      { from: sender }
    );
    console.log(tx.logs);
  });

  it("deploys contracts on combined deploy", async function() {
    //Get the address of each contract and try to interact with it
  });
});
