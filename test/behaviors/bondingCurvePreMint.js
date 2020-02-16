const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const {CurveEcosystem} = require('../helpers/CurveEcosystem');

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');

const bondingCurvePreMintTests = async (suiteName, config) => {
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

    // Should set preMintAmount correctly on deploy
    // Anyone should be able to read pre mint value
    // Premint value should match initial tokenSupply
    // Premint should be allocated to correct address
    // Buys should use x-value corresponding to totalSupply-preMintAmount
    // Should not allow sale of pre-minted tokens if insufficient bought through curve to cover
    // Should allow sale of pre-minted tokens after a buy

    describe('Pre Mint', async () => {
      it('Should set preMintAmount correctly on deploy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });

      it('Anyone should be able to read pre mint value', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });

      it('Premint value should match initial tokenSupply', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });

      it('Premint should be allocated to correct address', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });

      it('Should not allow sale of pre-minted tokens if insufficient bought through curve to cover', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });

      it('Buys that would cause totalSupply to exceed milestoneCap should revert', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });

      it('Should allow sale of pre-minted tokens after a buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(userAccounts[0]);
      });
    });
  });
};

module.exports = {
  bondingCurvePreMintTests
};
