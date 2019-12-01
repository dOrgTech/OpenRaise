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

require("../setup");
const { deployProject, deployStaticCurveLogic } = require("../../index.js");

contract("StaticCurveLogic", accounts => {
  let tx;
  let result;
  let project;


  const initializer = accounts[1];

  // Ratio of send tokens to minted tokens = tokenRatio / PRECISION
  const precision = new BN(1000000);
  const tokenRatio = new BN(100000000);

  let values = [
    {
      totalSupply: new BN(1),
      reserveBalance: new BN(1),
      amount: new BN(1)
    },
    {
      totalSupply: new BN("1000000"),
      reserveBalance: new BN("1000000"),
      amount: new BN("1000000")
    },
    {
      totalSupply: new BN(Math.pow(1, 20)),
      reserveBalance: new BN("1000000000000000000"),
      amount: new BN("1000000000000000000")
    }
  ];

  beforeEach(async function() {
    project = await deployProject();
    this.curve = await deployStaticCurveLogic(project, [tokenRatio.toString()]);
  });

  it("should set parameter correctly", async function() {
    result = await this.curve.methods.tokenRatio().call({ from: initializer });
    expect(result).to.be.equal(tokenRatio.toString());
  });

  it(`calculate correct buy results for all value sets`, async function() {
    for (let i = 0; i < values.length; i++) {
      const valueSet = values[i];
      result = await this.curve.methods
        .calcMintPrice(
          valueSet.totalSupply.toString(),
          valueSet.reserveBalance.toString(),
          valueSet.amount.toString()
        )
        .call({
          from: initializer
        });

      expect(new BN(result)).to.be.bignumber.equal(
        tokenRatio.mul(valueSet.amount).div(precision)
      );
    }
  });

  it(`calculate correct sell results for all value sets`, async function() {
    for (let i = 0; i < values.length; i++) {
      const valueSet = values[i];
      result = await this.curve.methods
        .calcBurnReward(
          valueSet.totalSupply.toString(),
          valueSet.reserveBalance.toString(),
          valueSet.amount.toString()
        )
        .call({
          from: initializer
        });

      expect(new BN(result)).to.be.bignumber.equal(
        tokenRatio.mul(valueSet.amount).div(precision)
      );
    }
  });

  it(`should return correct token precision`, async function() {
    result = await this.curve.methods
      .tokenRatioPrecision()
      .call({ from: initializer });
    expect(new BN(result)).to.be.bignumber.equal(precision);
  });
});
