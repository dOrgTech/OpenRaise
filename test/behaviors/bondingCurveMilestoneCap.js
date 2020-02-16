const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const BondedToken = artifacts.require('BondedToken.sol');
const {CurveLogicType, CollateralType, TokenType} = require('../helpers/CurveEcosystemConfig');

const expectEvent = require('../expectEvent');

const {CurveEcosystem} = require('../helpers/CurveEcosystem');
const {str, bn, toWad} = require('../helpers/utils');

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');

const bondingCurveMilestoneCapTests = async (suiteName, config) => {
  contract('Bonding Curve Milestone Cap', async accounts => {
    const adminAccount = accounts[0];
    const curveOwner = accounts[1];
    const tokenMinter = accounts[2];
    const userAccounts = accounts.slice(3, accounts.length);
    const miscUser = userAccounts[0];

    const accountsConfig = {
      adminAccount,
      curveOwner,
      minter: tokenMinter,
      userAccounts,
      miscUser
    };

    const noPreMintConfig = {
      ...config,
      deployParams: {
        ...config.deployParams,
        curveParams: {
          ...config.deployParams.curveParams,
          preMintAmount: toWad(0)
        }
      }
    };

    const preMintConfig = {
      ...config,
      deployParams: {
        ...config.deployParams,
        curveParams: {
          ...config.deployParams.curveParams,
          preMintAmount: toWad(100)
        }
      }
    };

    describe('Milestone Cap', async () => {
      it('Owner should be able to change cap to valid value (>= totalSupply), without existing totalSupply', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());

        const intendedCap = toWad(100).add(totalSupply);
        await bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount});

        const newMilestoneCap = await bondingCurve.milestoneCap({from: adminAccount});
        expect(str(newMilestoneCap)).to.be.equal(str(intendedCap));
      });

      it('Owner should be able to change cap to valid value (>= totalSupply), with existing totalSupply (from pre-mint)', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());

        const intendedCap = toWad(100).add(totalSupply);
        await bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount});

        const newMilestoneCap = await bondingCurve.milestoneCap({from: adminAccount});
        expect(str(newMilestoneCap)).to.be.equal(str(intendedCap));
      });

      it('Owner shouldnt be able to change cap to invalid value (< totalSupply)', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());

        const intendedCap = totalSupply.sub(toWad(10));

        await expectRevert.unspecified(
          bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount})
        );
      });

      it('Owner shouldnt be able to change cap to invalid value (0)', async () => {
        const eco = new CurveEcosystem(accountsConfig, noPreMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const intendedCap = bn(0);

        await expectRevert.unspecified(
          bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount})
        );
      });

      it('Non-owner should not be able to change cap to valid value (>= totalSupply), without existing totalSupply', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());

        const intendedCap = toWad(100).add(totalSupply);
        await expectRevert.unspecified(
          bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount})
        );
      });

      it('Non-owner should not be able to change cap to valid value (>= totalSupply), with existing totalSupply (from pre-mint)', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());
        const intendedCap = toWad(100).add(totalSupply);

        await expectRevert.unspecified(
          bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount})
        );
      });

      it('Non-owner should notnt be able to change cap to invalid value (< totalSupply)', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());
        const intendedCap = totalSupply.sub(toWad(10));

        await expectRevert.unspecified(
          bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount})
        );
      });

      it('Anyone should be able to read the milestone cap value', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        const milestoneCap = await bondingCurve.milestoneCap().call({from: miscUser});
      });

      it('Cap value changes should emit events', async () => {
        const eco = new CurveEcosystem(accountsConfig, preMintConfig);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        const totalSupply = bn(await bondedToken.totalSupply());

        const intendedCap = toWad(100).add(totalSupply);
        const tx = await bondingCurve.setMilestoneCap(intendedCap, {from: adminAccount});

        expectEvent.inLogs(tx.events, 'MilestoneCapSet');
      });

      xit('Buys that would cause totalSupply to exceed milestoneCap should revert', async () => {});

      xit('Buys that would cause totalSupply to be <= milestoneCap should succeed', async () => {});
    });
  });
};

module.exports = {
  bondingCurveMilestoneCapTests
};
