// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectRevert} = require('openzeppelin-test-helpers');

const expectEvent = require('../expectEvent');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();

const deploy = require('../../index.js');

const {bondedTokenValues, paymentTokenValues} = require('../constants/tokenValues');
const contractConstants = require('../constants/contractConstants.js');

const {
  shouldBehaveLikeBondingCurveControlled
} = require('../behaviors/BondingCurveControlled.behavior.ts');
/*
  Uses StaticCurveLogic for simpler tests.
*/

contract('Bonding Curve', async accounts => {
  const adminAccount = accounts[0];
  const curveOwner = accounts[1];
  const tokenMinter = accounts[2];
  const userAccounts = accounts.slice(3, accounts.length);
  const miscUser = userAccounts[0];

  let deployParams = {
    owner: curveOwner,
    beneficiary: curveOwner,
    buyCurveParams: new BN(100000000), //1 bondedToken minted for every 100 collateralTokens sent
    sellCurveParams: new BN(10000000), //10 collateralTokens returned for every bondedToken burned
    collateralToken: null,
    splitOnPay: new BN(50),
    bondedTokenName: 'BondedToken',
    bondedTokenSymbol: 'BND'
  };

  context('Bonding Curve - Average Paramters, StaticCurveLogic', async () => {
    await shouldBehaveLikeBondingCurveControlled(
      {
        adminAccount,
        curveOwner,
        tokenMinter,
        userAccounts,
        miscUser
      },
      {deployParams, bondedTokenValues, paymentTokenValues}
    );
  });
});
