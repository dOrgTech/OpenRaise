const {BN, constants, expectRevert} = require('openzeppelin-test-helpers');
const {ZWeb3} = require('@openzeppelin/upgrades');
const {CurveLogicType, TokenType} = require('../helpers/CurveEcosystemConfig');
const {bn, str} = require('./utils');
const expectEvent = require('../expectEvent');
const deploy = require('../../index.js');

const {ZERO_ADDRESS} = constants;
require('../setup');

class FactoryEcosystem {
  constructor(accounts, config) {
    this.config = config;
    this.accounts = accounts;
    this.contracts = {};
  }

  async deployFactoryEcosystem(web3) {
    const {adminAccount, curveOwner, tokenMinter, userAccounts, miscUser} = this.accounts;

    const project = await deploy.setupApp({adminAccount});

    const bancorCurveService = await deploy.deployBancorCurveService(project);

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

    const factory = await deploy.deployBondingCurveFactory(project, [
      staticCurveLogicImpl,
      bancorCurveLogicImpl,
      polynomialCurveLogicImpl,
      bondedTokenImpl,
      bondedTokenEtherImpl,
      bondingCurveImpl,
      bondingCurveEtherImpl,
      rewardsDistributorImpl,
      bancorCurveService.address
    ]);

    const {
      curveParams,
      curveLogicType,
      collateralType,
      bondedTokenParams,
      collateralTokenParams,
      curveLogicParams
    } = this.config.deployParams;

    let paymentToken;

    if (collateralType === TokenType.ERC20) {
      const paymentTokenInitialBalance = bn(web3.utils.toWei('60000', 'ether'));
      paymentToken = await deploy.deployBondedToken(project, [
        'BNDT',
        'BNDT',
        18,
        tokenMinter,
        tokenMinter,
        str(paymentTokenInitialBalance),
        ZERO_ADDRESS,
        ZERO_ADDRESS
      ]);
    }

    return {project, factory, paymentToken, bancorCurveService};
  }

  async deployBondingCurve(project, factory) {
    const {adminAccount, curveOwner, tokenMinter, userAccounts, miscUser} = this.accounts;
    const {
      curveParams,
      curveLogicType,
      collateralType,
      bondedTokenParams,
      collateralTokenParams,
      curveLogicParams
    } = this.config.deployParams;

    let paymentToken;

    if (collateralType === TokenType.ERC20) {
      const paymentTokenInitialBalance = bn(web3.utils.toWei('60000', 'ether'));
      paymentToken = await deploy.deployBondedToken(project, [
        'BNDT',
        'BNDT',
        18,
        tokenMinter,
        tokenMinter,
        str(paymentTokenInitialBalance),
        ZERO_ADDRESS,
        ZERO_ADDRESS
      ]);
    }

    const deployTx = await factory.methods
      .deploy(
        [collateralType, curveLogicType],
        [
          curveOwner,
          curveOwner,
          paymentToken ? paymentToken.address : ZERO_ADDRESS,
          curveOwner
        ],
        [
          str(curveLogicParams.tokenRatio),
          str(curveParams.reservePercentage),
          str(curveParams.dividendPercentage),
          str(curveParams.preMintAmount)
        ],
        bondedTokenParams.name,
        bondedTokenParams.symbol
      )
      .send({from: curveOwner});

    const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');
    const deployedContracts = await this.getContractsFromDeployedEvent(createdEvent);

    this.contracts = {
      bondingCurve: deployedContracts.bondingCurve,
      bondedToken: deployedContracts.bondedToken,
      paymentToken: paymentToken ? paymentToken : ZERO_ADDRESS,
      rewardsDistributor: deployedContracts.rewardsDistributor,
      buyCurve: deployedContracts.buyCurve
    };

    return this.contracts;
  }

  async getContractsFromDeployedEvent(event) {
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
}

module.exports = {
  FactoryEcosystem
};
