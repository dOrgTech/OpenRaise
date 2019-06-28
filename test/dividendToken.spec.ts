// Import all required modules from openzeppelin-test-helpers
const { BN, constants, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
 
// Import preferred chai flavor: both expect and should are supported
const { expect } = require('chai');

const TestToken = artifacts.require('TestToken');
const DividendToken = artifacts.require('DividendToken');
 
contract('DividendToken', ([sender, receiver]) => {
  beforeEach(async function () {

    this.erc20 = await TestToken.new(
        'PaymentToken',
        'PAY',
        18
    );

    this.dividendToken = await DividendToken.new(
        "BondedToken",
        "BND",
        18,
        sender,
        this.erc20.address,
        true
    );

    this.value = new BN(1); // The bundled BN library is the same one truffle and web3 use under the hood
  });
 
  it('reverts when transferring tokens to the zero address', async function () {
    // Edge cases that trigger a require statement can be tested for, optionally checking the revert reason as well
    await expectRevert.unspecified(this.dividendToken.transfer(constants.ZERO_ADDRESS, this.value, { from: sender }));
  });

  it('emits a Transfer event on successful mint', async function () {
    const { logs } = await this.dividendToken.mint(sender, this.value, { from: sender });
    expectEvent.inLogs(logs, 'Transfer', { from: constants.ZERO_ADDRESS, to: sender, value: this.value });
  });

  it('updates balances on successful mint', async function () {
    await this.dividendToken.mint(receiver, this.value, { from: sender });
    // chai-bn is installed, which means BN values can be tested and compared using the bignumber property in chai
    expect(await this.dividendToken.balanceOf(receiver)).to.be.bignumber.equal(this.value);
  });
 
  it('emits a Transfer event on successful transfers', async function () {
    await this.dividendToken.mint(sender, this.value, { from: sender });
    const { logs } = await this.dividendToken.transfer(receiver, this.value, { from: sender });
    // Log-checking will not only look at the event name, but also the values, which can be addresses, strings, numbers, etc.
    expectEvent.inLogs(logs, 'Transfer', { from: sender, to: receiver, value: this.value });
  });
 
  it('updates balances on successful transfers', async function () {
    await this.dividendToken.mint(sender, this.value, { from: sender });
    await this.dividendToken.transfer(receiver, this.value, { from: sender });
    // chai-bn is installed, which means BN values can be tested and compared using the bignumber property in chai
    expect(await this.dividendToken.balanceOf(receiver)).to.be.bignumber.equal(this.value);
  });
});