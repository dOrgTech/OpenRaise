const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {expect} = require('chai');
const BondedToken = artifacts.require('BondedToken.sol');
const expectEvent = require('../expectEvent');
const {CurveEcosystem} = require('../helpers/CurveEcosystem');
const {str, bn} = require('../helpers/utils');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');

const {ZERO_ADDRESS} = constants;

const bondingCurveDeployTests = async (suiteName, config) => {
  contract('Bonding Curve Admin', async accounts => {
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

    describe('', async () => {
      it('should have properly initialized parameters', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        expect(await bondingCurve.owner({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.collateralToken({from: miscUser})).to.be.equal(
          paymentToken.address
        );
        expect(await bondingCurve.bondedToken({from: miscUser})).to.be.equal(bondedToken.address);
        expect(await bondingCurve.buyCurve({from: miscUser})).to.be.equal(buyCurve.address);
        expect(
          new BN(await bondingCurve.reservePercentage({from: miscUser}))
        ).to.be.bignumber.equal(config.deployParams.curveParams.reservePercentage);
        expect(
          new BN(await bondingCurve.dividendPercentage({from: miscUser}))
        ).to.be.bignumber.equal(config.deployParams.curveParams.dividendPercentage);
        expect(await bondingCurve.reserveBalance({from: miscUser})).to.be.bignumber.equal('0');
        expect(await bondingCurve.getPaymentThreshold({from: miscUser})).to.be.bignumber.equal(
          '100'
        );
      });
    });
  });
};

module.exports = {
  bondingCurveDeployTests
};
