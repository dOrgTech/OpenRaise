const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;
const {expect} = require('chai');
const {ZWeb3} = require('@openzeppelin/upgrades');
const BondedToken = artifacts.require('BondedToken.sol');
require('../../setup');
const expectEvent = require('../../expectEvent');
const deploy = require('../../../index.js');
const {defaultTestConfig} = require('../../helpers/ecosystemConfigs');
const {str, bn, toWad, CurveTypes, CollateralTypes} = require('../../helpers/utils');
const {hasERC20Collateral, hasEtherCollateral} = require('../..//helpers/BaseEcosystem');

const {FactoryEcosystem} = require('../../helpers/FactoryEcosystem');

const bondingCurveFactoryCurveDeployTests = async (suiteName, config) => {
  contract(`Factory - Curve Deployment ${suiteName}`, async accounts => {
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

    describe('Factory - Deploy Bonding Curve', async () => {
      it('should have properly initialized parameters', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory} = await eco.deployFactoryEcosystem(web3);
        const {
          bondingCurve,
          bondedToken,
          paymentToken,
          rewardsDistributor,
          buyCurve
        } = await eco.deployBondingCurve(project, factory);

        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(curveOwner);

        if (hasERC20Collateral(config)) {
          expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
            paymentToken.address
          );
        }

        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(bondedToken.options.address);
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(buyCurve.options.address);
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(config.deployParams.curveParams.reservePercentage));
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(config.deployParams.curveParams.dividendPercentage));
        expect(bn(await bondingCurve.methods.reserveBalance().call({from: miscUser}))).to.be.bignumber.equal(bn(0));
        expect(bn(await bondingCurve.methods.getPaymentThreshold().call({from: miscUser}))).to.be.bignumber.equal(
          bn(100)
        );
      });

      it('should deploy contracts on deploy', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory} = await eco.deployFactoryEcosystem(web3);
        const {
          bondingCurve,
          bondedToken,
          paymentToken,
          rewardsDistributor,
          buyCurve
        } = await eco.deployBondingCurve(project, factory);

        //Just verify that code exists at the address
        const nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory} = await eco.deployFactoryEcosystem(web3);
        const {
          bondingCurve,
          bondedToken,
          paymentToken,
          rewardsDistributor,
          buyCurve
        } = await eco.deployBondingCurve(project, factory);

        const tokenAmount = bn(1000);
        const expectedPrice = bn(100000);

        const result = await buyCurve.methods
          .calcMintPrice(0, 0, tokenAmount.toString())
          .call({from: miscUser});

        expect(bn(result)).to.be.bignumber.equal(expectedPrice);
      });

      it('should correctly initialize bonded token parameters', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory} = await eco.deployFactoryEcosystem(web3);
        const {
          bondingCurve,
          bondedToken,
          paymentToken,
          rewardsDistributor,
          buyCurve
        } = await eco.deployBondingCurve(project, factory);

        const {bondedTokenParams, curveParams} = config.deployParams;

        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory} = await eco.deployFactoryEcosystem(web3);
        const {
          bondingCurve,
          bondedToken,
          paymentToken,
          rewardsDistributor,
          buyCurve
        } = await eco.deployBondingCurve(project, factory);

        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        const eco = new FactoryEcosystem(accountsConfig, config);
        const {project, factory} = await eco.deployFactoryEcosystem(web3);
        
        const {
          bondingCurve,
          bondedToken,
          paymentToken,
          rewardsDistributor,
          buyCurve
        } = await eco.deployBondingCurve(project, factory);

        const {curveParams} = config.deployParams;

        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );

        if (hasERC20Collateral(config)) {
          expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
            paymentToken.options.address
          );
        }

        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
        expect(
          bn(await bondingCurve.methods.preMintAmount().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.preMintAmount);
      });
    });
  });
};

async function getContractsFromDeployedEvent(event) {
  const contracts = {
    bondingCurve: undefined,
    bondedToken: undefined,
    buyCurve: undefined,
    rewardsDistributor: undefined
  };

  contracts.bondingCurve = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.BondingCurve),
    await expectEvent.getParameter(event, 'bondingCurve')
  );
  contracts.bondedToken = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.BondedToken),
    await expectEvent.getParameter(event, 'bondedToken')
  );
  contracts.buyCurve = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.StaticCurveLogic),
    await expectEvent.getParameter(event, 'buyCurve')
  );
  contracts.rewardsDistributor = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.RewardsDistributor),
    await expectEvent.getParameter(event, 'rewardsDistributor')
  );

  return contracts;
}

module.exports = {
  bondingCurveFactoryCurveDeployTests
};
