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
const ClaimsToken = artifacts.require("ClaimsToken");
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
    claimsToken: {
      name: "BondedToken",
      symbol: "BND",
      decimals: new BN(18),
      controller: sender
    },
    bondingCurve: {
      beneficiary: sender
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

    const createdEvent = expectEvent.inLogs(tx.logs, "FundraisingDeployed");

    const bondingCurve = await BondingCurve.at(createdEvent.args.bondingCurve);
    const claimsToken = await ClaimsToken.at(createdEvent.args.claimsToken);
    const buyCurve = await BancorCurveLogic.at(createdEvent.args.buyCurve);
    const sellCurve = await BancorCurveLogic.at(createdEvent.args.sellCurve);

    // Call methods on all contracts to verify deployment

    // expect(await bondingCurve.getBeneficiary()).to.be.equal(
    //   values.bondingCurve.beneficiary
    // );
    expect(await claimsToken.totalSupply()).to.be.bignumber.equal(new BN(0));
    // expect(
    //   await buyCurve.calcMintPrice(100000, 100000, 1000)
    // ).to.be.bignumber.equal(new BN(0));
    // expect(
    //   await sellCurve.calcMintPrice(10000, 10000, 10000)
    // ).to.be.bignumber.equal(new BN(0));
  });

  it("deploys contracts on combined deploy", async function() {
    //Get the address of each contract and try to interact with it
  });
});
