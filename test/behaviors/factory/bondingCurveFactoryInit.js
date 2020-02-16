const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const {expect} = require('chai');
const deploy = require('../../../index.js');

const {FactoryEcosystem} = require('../../helpers/FactoryEcosystem');

const bondingCurveFactoryInitTests = async (suiteName, config) => {
  contract('Factory Initialization', async accounts => {
    const adminAccount = accounts[0];
    const curveOwner = accounts[1];
    const tokenMinter = accounts[2];
    const userAccounts = accounts.slice(3, accounts.length);
    const miscUser = userAccounts[0];

    const accountsConfig = {
      adminAccount,
      curveOwner,
      tokenMinter,
      userAccounts,
      miscUser
    };

    describe('Factory - Initialize', async () => {
      it('should have properly initialized parameters', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory, bancorCurveService} = await eco.deployFactoryEcosystem(web3);

        const result = await factory.methods.getImplementations().call({from: miscUser});

        const staticCurveLogicImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.StaticCurveLogic
        );
        const bancorCurveLogicImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.BancorCurveLogic
        );
        const polynomialCurveLogicImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.PolynomialCurveLogic
        );
        const bondedTokenImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.BondedToken
        );
        const bondedTokenEtherImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.BondedTokenEther
        );
        const bondingCurveImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.BondingCurve
        );
        const bondingCurveEtherImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.BondingCurveEther
        );
        const rewardsDistributorImpl = await deploy.getImplementation(
          project,
          deploy.CONTRACT_NAMES.RewardsDistributor
        );

        expect(result.staticCurveLogicImpl).to.be.equal(staticCurveLogicImpl);
        expect(result.bancorCurveLogicImpl).to.be.equal(bancorCurveLogicImpl);
        expect(result.polynomialCurveLogicImpl).to.be.equal(polynomialCurveLogicImpl);
        expect(result.bondedTokenImpl).to.be.equal(bondedTokenImpl);
        expect(result.bondedTokenEtherImpl).to.be.equal(bondedTokenEtherImpl);
        expect(result.bondingCurveImpl).to.be.equal(bondingCurveImpl);
        expect(result.bondingCurveEtherImpl).to.be.equal(bondingCurveEtherImpl);
        expect(result.rewardsDistributorImpl).to.be.equal(rewardsDistributorImpl);
        expect(result.bancorCurveServiceImpl).to.be.equal(bancorCurveService.address);
      });
    });
  });
};

module.exports = {
  bondingCurveFactoryInitTests
};
