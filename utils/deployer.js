const {Contracts, SimpleProject, ZWeb3, AppProject, Package} = require('@openzeppelin/upgrades');

const StaticCurveLogic = Contracts.getFromLocal('StaticCurveLogic');
const BancorFormula = Contracts.getFromLocal('BancorFormula');
const BancorCurveLogic = Contracts.getFromLocal('BancorCurveLogic');
const BancorCurveService = Contracts.getFromLocal('BancorCurveService');
const BondingCurve = Contracts.getFromLocal('BondingCurve');
const BondingCurveFactory = Contracts.getFromLocal('BondingCurveFactory');
const BondedToken = Contracts.getFromLocal('BondedToken');
const RewardsDistributor = Contracts.getFromLocal('RewardsDistributor');

const CONTRACT_ABIS = {
  BondingCurve,
  BondingCurveFactory,
  BancorCurveLogic,
  StaticCurveLogic,
  BondedToken,
  BancorCurveService,
  RewardsDistributor
};

const CONTRACT_NAMES = {
  BondingCurve: 'BondingCurve',
  BondingCurveFactory: 'BondingCurveFactory',
  BancorCurveLogic: 'BancorCurveLogic',
  StaticCurveLogic: 'StaticCurveLogic',
  BondedToken: 'BondedToken',
  BancorCurveService: 'BancorCurveService',
  RewardsDistributor: 'RewardsDistributor'
};

const PACKAGE_NAMES = {
  self: 'example-openzeppelin-upgrades-simple'
};

class Deployer {
  constructor(web3) {
    this.web3 = web3;
  }

  setWeb3(web3) {
    this.web3 = web3;
  }

  async setupApp(txParams) {
    // On-chain, single entry point of the entire application.
    const initialVersion = '2.5.2';
    this.appProject = await AppProject.fetchOrDeploy(
      'example-openzeppelin-upgrades-simple',
      initialVersion,
      txParams,
      {}
    );

    // Add all implementations
    await this.appProject.setImplementation(BondingCurve, CONTRACT_NAMES.BondingCurve);
    await this.appProject.setImplementation(
      BondingCurveFactory,
      CONTRACT_NAMES.BondingCurveFactory
    );
    await this.appProject.setImplementation(BancorCurveLogic, CONTRACT_NAMES.BancorCurveLogic);
    await this.appProject.setImplementation(StaticCurveLogic, CONTRACT_NAMES.StaticCurveLogic);
    await this.appProject.setImplementation(BondedToken, CONTRACT_NAMES.BondedToken);
    await this.appProject.setImplementation(BancorCurveService, CONTRACT_NAMES.BancorCurveService);
    await this.appProject.setImplementation(RewardsDistributor, CONTRACT_NAMES.RewardsDistributor);
  }

  async deployProject() {
    ZWeb3.initialize(this.web3.currentProvider);
    const [creatorAddress, initializerAddress] = await ZWeb3.accounts();
    this.project = new SimpleProject('MyProject', null, {
      from: creatorAddress
    });
  }

  async deployStaticCurveLogic(initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);
    const instance = await this.project.createProxy(StaticCurveLogic, {
      initArgs
    });
    return instance;
  }

  async deployBancorFormula() {
    ZWeb3.initialize(this.web3.currentProvider);
    const [creatorAddress, initializerAddress] = await ZWeb3.accounts();

    const instance = await this.project.createProxy(BancorFormula);
    await instance.methods.initialize().send({from: initializerAddress});
    return instance;
  }

  async deployBancorCurveService() {
    ZWeb3.initialize(this.web3.currentProvider);
    const [creatorAddress, initializerAddress] = await ZWeb3.accounts();

    const instance = await this.project.createProxy(BancorCurveService);
    await instance.methods.initialize().send({from: initializerAddress});
    return instance;
  }

  async deployBancorCurveLogic(initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(BancorCurveLogic, {
      initArgs
    });
    return instance;
  }

  async createBondingCurve() {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(BondingCurve);
    return instance;
  }

  async deployBondingCurve(initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(BondingCurve, {
      initArgs
    });
    return instance;
  }

  async deployBondingCurveFactory(initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(BondingCurveFactory, {
      initArgs
    });
    return instance;
  }

  async createBondedToken() {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(BondedToken);
    return instance;
  }

  async deployBondedToken(initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(BondedToken, {
      initArgs
    });
    return instance;
  }

  async deployStandaloneERC20(initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);
    const instance = await this.project.createProxy(BondedToken, {
      initArgs
    });
    return instance;
  }

  async deployRewardsDistributor(myProject, initArgs) {
    ZWeb3.initialize(this.web3.currentProvider);

    const instance = await this.project.createProxy(RewardsDistributor, {
      initArgs
    });
    return instance;
  }

  async getImplementation(project, contractName) {
    const directory = await this.project.getCurrentDirectory();
    const implementation = await directory.getImplementation(contractName);
    return implementation;
  }
}

module.exports = Deployer;
