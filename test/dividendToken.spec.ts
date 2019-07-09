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

const PaymentToken = artifacts.require("StandaloneERC20");
const DividendToken = artifacts.require("DividendToken");

contract("DividendToken", ([sender, receiver]) => {
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
    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals
    );

    values.dividendToken.paymentToken = this.paymentToken.address;

    this.dividendToken = await DividendToken.new();
    this.dividendToken.initialize(
      values.dividendToken.name,
      values.dividendToken.symbol,
      values.dividendToken.decimals,
      values.dividendToken.controller,
      values.dividendToken.paymentToken,
      values.dividendToken.transfersEnabled
    );

    this.value = new BN(1); // The bundled BN library is the same one truffle and web3 use under the hood
  });

  it("should have properly initialized values", async function() {
    expect(await this.dividendToken.name()).to.be.equal(
      values.dividendToken.name
    );

    expect(await this.dividendToken.symbol()).to.be.equal(
      values.dividendToken.symbol
    );

    expect(await this.dividendToken.decimals()).to.be.bignumber.equal(
      values.dividendToken.decimals
    );

    expect(await this.dividendToken.getController()).to.be.equal(
      values.dividendToken.controller
    );

    expect(await this.dividendToken.paymentToken()).to.be.equal(
      values.dividendToken.paymentToken
    );

    expect(await this.dividendToken.transfersEnabled()).to.be.equal(
      values.dividendToken.transfersEnabled
    );
  });

  it("reverts when transferring tokens to the zero address", async function() {
    // Edge cases that trigger a require statement can be tested for, optionally checking the revert reason as well
    await expectRevert.unspecified(
      this.dividendToken.transfer(constants.ZERO_ADDRESS, this.value, {
        from: sender
      })
    );
  });

  it("emits a Transfer event on successful mint", async function() {
    const { logs } = await this.dividendToken.mint(sender, this.value, {
      from: sender
    });
    expectEvent.inLogs(logs, "Transfer", {
      from: constants.ZERO_ADDRESS,
      to: sender,
      value: this.value
    });
  });

  it("updates balances on successful mint", async function() {
    await this.dividendToken.mint(receiver, this.value, { from: sender });
    // chai-bn is installed, which means BN values can be tested and compared using the bignumber property in chai
    expect(await this.dividendToken.balanceOf(receiver)).to.be.bignumber.equal(
      this.value
    );
  });

  it("emits a Transfer event on successful transfers", async function() {
    await this.dividendToken.mint(sender, this.value, { from: sender });
    const { logs } = await this.dividendToken.transfer(receiver, this.value, {
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
    await this.dividendToken.mint(sender, this.value, { from: sender });
    await this.dividendToken.transfer(receiver, this.value, { from: sender });
    // chai-bn is installed, which means BN values can be tested and compared using the bignumber property in chai
    expect(await this.dividendToken.balanceOf(receiver)).to.be.bignumber.equal(
      this.value
    );
  });
});
