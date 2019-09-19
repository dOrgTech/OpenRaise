// Required by @openzeppelin/upgrades when running from truffle
global.artifacts = artifacts;
global.web3 = web3;

const {Contracts, SimpleProject, ZWeb3, AppProject, Package} = require('@openzeppelin/upgrades');

const StaticCurveLogic = Contracts.getFromLocal('StaticCurveLogic');
const BancorFormula = Contracts.getFromLocal('BancorFormula');
const BancorCurveLogic = Contracts.getFromLocal('BancorCurveLogic');
const BancorCurveService = Contracts.getFromLocal('BancorCurveService');
const BondingCurve = Contracts.getFromLocal('BondingCurve');
const BondingCurveFactory = Contracts.getFromLocal('BondingCurveFactory');
const BondedToken = Contracts.getFromLocal('BondedToken');
const RewardsDistributor = Contracts.getFromLocal('RewardsDistributor');

//Controlled
const BondingCurveController = Contracts.getFromLocal('BondingCurveController');
const BondingCurveControlled = Contracts.getFromLocal('BondingCurveControlled');
const BondingCurveControlledFactory = Contracts.getFromLocal('BondingCurveControlledFactory');

const CONTRACT_ABIS = {
  BondingCurve,
  BondingCurveFactory,
  BancorCurveLogic,
  StaticCurveLogic,
  BondedToken,
  BancorCurveService,
  RewardsDistributor,
  BondingCurveController,
  BondingCurveControlled,
  BondingCurveControlledFactory
};

const CONTRACT_NAMES = {
  BondingCurve: 'BondingCurve',
  BondingCurveFactory: 'BondingCurveFactory',
  BancorCurveLogic: 'BancorCurveLogic',
  StaticCurveLogic: 'StaticCurveLogic',
  BondedToken: 'BondedToken',
  BancorCurveService: 'BancorCurveService',
  RewardsDistributor: 'RewardsDistributor',
  BondingCurveController: 'BondingCurveController',
  BondingCurveControlled: 'BondingCurveControlled',
  BondingCurveControlledFactory: 'BondingCurveControlledFactory'
};

const PACKAGE_NAMES = {
  self: 'example-openzeppelin-upgrades-simple'
};

async function setupApp(txParams) {
  // On-chain, single entry point of the entire application.
  const initialVersion = '2.5.2';
  const appProject = await AppProject.fetchOrDeploy('@dorg/bc-dao', initialVersion, txParams, {});

  // Add all implementations
  await appProject.setImplementation(BondingCurve, CONTRACT_NAMES.BondingCurve);
  await appProject.setImplementation(BondingCurveFactory, CONTRACT_NAMES.BondingCurveFactory);
  await appProject.setImplementation(BancorCurveLogic, CONTRACT_NAMES.BancorCurveLogic);
  await appProject.setImplementation(StaticCurveLogic, CONTRACT_NAMES.StaticCurveLogic);
  await appProject.setImplementation(BondedToken, CONTRACT_NAMES.BondedToken);
  await appProject.setImplementation(BancorCurveService, CONTRACT_NAMES.BancorCurveService);
  await appProject.setImplementation(RewardsDistributor, CONTRACT_NAMES.RewardsDistributor);
  await appProject.setImplementation(BondingCurveController, CONTRACT_NAMES.BondingCurveController);
  await appProject.setImplementation(BondingCurveControlled, CONTRACT_NAMES.BondingCurveControlled);
  await appProject.setImplementation(
    BondingCurveControlledFactory,
    CONTRACT_NAMES.BondingCurveControlledFactory
  );

  return appProject;
}

async function deployProject() {
  ZWeb3.initialize(web3.currentProvider);
  const [creatorAddress, initializerAddress] = await ZWeb3.accounts();
  const myProject = new SimpleProject('MyProject', null, {
    from: creatorAddress
  });

  return myProject;
}

async function deployStaticCurveLogic(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);
  const instance = await myProject.createProxy(StaticCurveLogic, {
    initArgs
  });
  return instance;
}

async function deployBancorFormula(myProject) {
  ZWeb3.initialize(web3.currentProvider);
  const [creatorAddress, initializerAddress] = await ZWeb3.accounts();

  const instance = await myProject.createProxy(BancorFormula);
  await instance.methods.initialize().send({from: initializerAddress});
  return instance;
}

async function deployBancorCurveService(myProject) {
  ZWeb3.initialize(web3.currentProvider);
  const [creatorAddress, initializerAddress] = await ZWeb3.accounts();

  const instance = await myProject.createProxy(BancorCurveService);
  await instance.methods.initialize().send({from: initializerAddress});
  return instance;
}

async function deployBancorCurveLogic(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BancorCurveLogic, {
    initArgs
  });
  return instance;
}

async function createBondingCurve(myProject) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondingCurve);
  return instance;
}

async function deployBondingCurve(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondingCurve, {
    initArgs
  });
  return instance;
}

async function deployBondingCurveFactory(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondingCurveFactory, {
    initArgs
  });
  return instance;
}

async function createBondedToken(myProject) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondedToken);
  return instance;
}

async function deployBondedToken(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondedToken, {
    initArgs
  });
  return instance;
}

async function deployStandaloneERC20(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondedToken, {
    initArgs
  });
  return instance;

  // const erc20Mintable = new web3.eth.Contract(erc20MintableAbi.abi);

  // const instance = await erc20Mintable
  //   .deploy({
  //     data: erc20MintableAbi.deployedBytecode
  //   })
  //   .send({
  //     from: creatorAddress
  //   });
}

async function deployBondingCurveController(myProject) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondingCurveController);
  return instance;
}

async function deployBondingCurveControlled(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondingCurveControlled, {
    initArgs
  });
  return instance;
}

async function deployBondingCurveControlledFactory(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(BondingCurveControlledFactory, {
    initArgs
  });
  return instance;
}

async function deployRewardsDistributor(myProject, initArgs) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(RewardsDistributor, {
    initArgs
  });
  return instance;
}

async function createRewardsDistributor(myProject) {
  ZWeb3.initialize(web3.currentProvider);

  const instance = await myProject.createProxy(RewardsDistributor);
  return instance;
}

async function getImplementation(project, contractName) {
  const directory = await project.getCurrentDirectory();
  const implementation = await directory.getImplementation(contractName);
  return implementation;
}

async function getAbi(contractName) {
  return CONTRACT_ABIS[contractName].schema.abi;
}

// For truffle exec
module.exports = function(callback) {
  main()
    .then(() => callback())
    .catch(err => callback(err));
};

// Logging
function log() {
  if (process.env.NODE_ENV !== 'test') {
    console.log.apply(this, arguments);
  }
}

// Testing
module.exports = {
  setupApp,
  deployProject,
  deployStaticCurveLogic,
  deployBancorFormula,
  deployBancorCurveService,
  deployBancorCurveLogic,
  createBondingCurve,
  deployBondingCurve,
  deployBondingCurveFactory,
  deployBondingCurveController,
  deployBondingCurveControlled,
  deployBondingCurveControlledFactory,
  deployBondedToken,
  deployStandaloneERC20,
  deployRewardsDistributor,
  createRewardsDistributor,
  CONTRACT_NAMES,
  CONTRACT_ABIS,
  getImplementation,
  getAbi
};
