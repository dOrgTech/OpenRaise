// Import all required modules from openzeppelin-test-helpers
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
const ClaimsToken = artifacts.require("ClaimsToken");
const BondingCurve = artifacts.require("BondingCurve");
const BancorCurveLogic = artifacts.require("BancorCurveLogic");
const App = artifacts.require("App");

contract("ClaimsToken", ([sender, receiver, testAccount]) => {
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
      controller: sender,
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
      "bc-dao",
      "ClaimsToken",
      receiver,
      encodeCall(
        "initialize",
        ["string", "string", "uint8", "address", "bool"],
        [
          values.claimsToken.name,
          values.claimsToken.symbol,
          values.claimsToken.decimals.toNumber(),
          values.claimsToken.controller,
          values.claimsToken.transfersEnabled
        ]
      )
    );

    this.claimsToken = await ClaimsToken.at(claimsTokenAddress);

    const buyCurveAddress = await appCreate(
      "bc-dao",
      "BancorCurveLogic",
      receiver,
      encodeCall("initialize", ["uint32"], [1000])
    );

    this.buyCurve = await BancorCurveLogic.at(buyCurveAddress);

    const sellCurveAddress = await appCreate(
      "bc-dao",
      "BancorCurveLogic",
      receiver,
      encodeCall("initialize", ["uint32"], [500])
    );

    this.sellCurve = await BancorCurveLogic.at(sellCurveAddress);

    const bondingCurveAddress = await appCreate(
      "bc-dao",
      "BondingCurve",
      receiver,
      encodeCall(
        "initialize",
        [
          "address",
          "address",
          "address",
          "address",
          "address",
          "address",
          "uint256"
        ],
        [
          this.paymentToken.address,
          sender,
          sender,
          this.buyCurve.address,
          this.sellCurve.address,
          this.claimsToken.address,
          new BN(50).toNumber()
        ]
      )
    );

    this.bondingCurve = await BondingCurve.at(bondingCurveAddress);
  });

  it("should have properly initialized values", async function() {
    expect(await this.bondingCurve.reserveToken()).to.be.equal(
      this.paymentToken.address
    );

    expect(await this.bondingCurve.bondedToken()).to.be.equal(
      this.claimsToken.address
    );

    expect(await this.bondingCurve.buyCurve()).to.be.equal(
      this.buyCurve.address
    );

    expect(await this.bondingCurve.sellCurve()).to.be.equal(
      this.sellCurve.address
    );

    expect(await this.bondingCurve.owner()).to.be.equal(sender);

    expect(await this.bondingCurve.beneficiary()).to.be.equal(sender);

    expect(await this.bondingCurve.splitOnPay()).to.be.bignumber.equal(
      new BN(50)
    );
  });

  it("should allow owner to set new beneficiary", async function() {
    tx = await this.bondingCurve.setBeneficiary(testAccount, { from: sender });
    expect(await this.bondingCurve.beneficiary()).to.be.equal(testAccount);
  });

  it("should not allow non-owner to set new beneficiary", async function() {
    await expectRevert.unspecified(
      this.bondingCurve.setBeneficiary(constants.ZERO_ADDRESS, {
        from: receiver
      })
    );
  });
});
