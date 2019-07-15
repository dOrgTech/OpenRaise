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
const App = artifacts.require("App");

contract("ClaimsToken", ([sender, receiver]) => {
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

    const data = encodeCall(
      "initialize",
      ["string", "string", "uint8", "address", "bool"],
      [
        values.claimsToken.name,
        values.claimsToken.symbol,
        values.claimsToken.decimals.toNumber(),
        values.claimsToken.controller,
        values.claimsToken.transfersEnabled
      ]
    );

    const proxyAddress = await appCreate(
      "bc-dao",
      "ClaimsToken",
      receiver,
      data
    );

    this.claimsToken = await ClaimsToken.at(proxyAddress);

    this.value = new BN(1); // The bundled BN library is the same one truffle and web3 use under the hood
  });

  it("should have properly initialized values", async function() {
    expect(await this.claimsToken.name()).to.be.equal(values.claimsToken.name);

    expect(await this.claimsToken.symbol()).to.be.equal(
      values.claimsToken.symbol
    );

    expect(await this.claimsToken.decimals()).to.be.bignumber.equal(
      values.claimsToken.decimals
    );

    expect(await this.claimsToken.owner()).to.be.equal(
      values.claimsToken.controller
    );

    expect(await this.claimsToken.transfersEnabled()).to.be.equal(
      values.claimsToken.transfersEnabled
    );
  });

  it("reverts when transferring tokens to the zero address", async function() {
    // Edge cases that trigger a require statement can be tested for, optionally checking the revert reason as well
    await expectRevert.unspecified(
      this.claimsToken.transfer(constants.ZERO_ADDRESS, this.value, {
        from: sender
      })
    );
  });

  it("emits a Transfer event on successful mint", async function() {
    const { logs } = await this.claimsToken.mint(sender, this.value, {
      from: sender
    });
    expectEvent.inLogs(logs, "Transfer", {
      from: constants.ZERO_ADDRESS,
      to: sender,
      value: this.value
    });
  });

  it("updates balances on successful mint", async function() {
    await this.claimsToken.mint(receiver, this.value, { from: sender });
    // chai-bn is installed, which means BN values can be tested and compared using the bignumber property in chai
    expect(await this.claimsToken.balanceOf(receiver)).to.be.bignumber.equal(
      this.value
    );
  });

  it("emits a Transfer event on successful transfers", async function() {
    await this.claimsToken.mint(sender, this.value, { from: sender });
    const { logs } = await this.claimsToken.transfer(receiver, this.value, {
      from: sender
    });
    // Log-checking will not only look at the event name, but also the values, which can be addresses, strings, numbers, etc.
    expectEvent.inLogs(logs, "Transfer", {
      from: sender,
      to: receiver,
      value: this.value
    });
  });

  it("updates balances on successful transfers", async function() {
    await this.claimsToken.mint(sender, this.value, { from: sender });
    await this.claimsToken.transfer(receiver, this.value, { from: sender });
    // chai-bn is installed, which means BN values can be tested and compared using the bignumber property in chai
    expect(await this.claimsToken.balanceOf(receiver)).to.be.bignumber.equal(
      this.value
    );
  });
});
