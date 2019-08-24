const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("openzeppelin-test-helpers");

// Import preferred chai flavor: both expect and should are supported
const expect = require("chai").expect;
const should = require("chai").should();

require("../setup");
const {
  deployProject,
  deployDividendPool,
  deployStandaloneERC20
} = require("../../index.js");

const { paymentTokenValues } = require("../constants/tokenValues");

contract("DividendPool", accounts => {
  let tx;
  let result;
  let project;

  let paymentToken;
  let dividendPool;

  const creator = accounts[0];
  const initializer = accounts[1];
  const minter = accounts[2];

  beforeEach(async function() {
    project = await deployProject();

    paymentToken = await deployStandaloneERC20(project, [
      paymentTokenValues.parameters.name,
      paymentTokenValues.parameters.symbol,
      paymentTokenValues.parameters.decimals,
      initializer
    ]);

    dividendPool = await deployDividendPool(project, [
      paymentToken.address,
      creator
    ]);
  });

  it("should initialize payment token parameters correctly", async function() {
    result = await dividendPool.methods.token().call({ from: initializer });
    expect(result).to.be.equal(paymentToken.address);
  });
  it("should initialize owner correctly", async function() {
    result = await dividendPool.methods.owner().call({ from: initializer });
    expect(result).to.be.equal(creator);
  });
  it("should register payment correctly", async function() {});
  it("should allow DAO to publish valid root", async function() {});
  it("should not allow DAO to publish invalid root", async function() {});

  it("should not allow any other address to publish valid root", async function() {});
  it("should not allow any other address to publish invalid root", async function() {});

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
