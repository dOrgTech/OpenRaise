/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');

const App = artifacts.require('App');

const contractNames = {
  StaticCurveLogic: 'StaticCurveLogic',
  BancorCurveLogic: 'BancorCurveLogic',
  BondedToken: 'BondedToken',
  DividendPool: 'DividendPool',
  BondingCurve: 'BondingCurve',
  BondingCurveFactory: 'BondingCurveFactory',
  BancorCurveService: 'BancorCurveService'
};

const BancorCurveService = artifacts.require('BancorCurveService');
const BondingCurveFactory = artifacts.require('BondingCurveFactory');

const truffleConfig = require('./truffle-config.js');

const BC_DAO_PACKAGE = '@dorg/bc-dao';

function activeNetwork() {
  const networkIndex = process.argv.lastIndexOf('--network');
  if (networkIndex < 2) {
    return 'development';
  }
  return process.argv[networkIndex + 1];
}

function activeNetworkName() {
  return activeNetwork() === 'development' ? `dev-${App.network_id}` : activeNetwork();
}

/*
 *  Get zos config info for specified networkId.
 */
function getOZNetworkConfig(networkName) {
  const zosNetworkFile = fs.readFileSync(`./.openzeppelin/${networkName}.json`);
  return JSON.parse(zosNetworkFile);
}

function getAppAddress() {
  const ozNetworkConfig = getOZNetworkConfig(activeNetworkName());
  return ozNetworkConfig.app.address;
}

function getLatestProxy(contractName) {
  const ozNetworkConfig = getOZNetworkConfig(activeNetworkName());
  const proxies = ozNetworkConfig.proxies[`${BC_DAO_PACKAGE}/${contractName}`];
  if (!proxies || proxies.length <= 1) {
    throw Error(`No deployed proxies of contract ${contractName} found`);
  }
  return proxies[proxies.length - 1];
}

function helpers() {
  return {
    constants: {
      ZERO_ADDRESS: '0x0000000000000000000000000000000000000000'
    }
  };
}

async function initializeBancorCurveService(contractAddress) {
  const contract = await BancorCurveService.at(contractAddress);
  return contract.initialize();
}

async function initializeBondingCurveFactory(contractAddress) {
  const ozNetworkConfig = getOZNetworkConfig(activeNetworkName());
  const contract = await BondingCurveFactory.at(contractAddress);

  return contract.initialize(
    ozNetworkConfig.contracts.StaticCurveLogic.address,
    ozNetworkConfig.contracts.BancorCurveLogic.address,
    ozNetworkConfig.contracts.BondedToken.address,
    ozNetworkConfig.contracts.BondingCurve.address,
    ozNetworkConfig.contracts.DividendPool.address,
    getLatestProxy(contractNames.BancorCurveService).address
  );
}

module.exports = async () => {
  const {constants} = helpers();
  try {
    const bancorCurveServiceAddress = getLatestProxy(contractNames.BancorCurveService).address;
    const bondingCurveFactoryAddress = getLatestProxy(contractNames.BondingCurveFactory).address;
    console.log(`${contractNames.BancorCurveService} to initialize:`, bancorCurveServiceAddress);
    console.log(`${contractNames.BondingCurveFactory} to initialize:`, bondingCurveFactoryAddress);

    let initializeTx = await initializeBancorCurveService(bancorCurveServiceAddress);
    console.log(`${contractNames.BancorCurveService} initialization tx:`, initializeTx.tx);

    initializeTx = await initializeBondingCurveFactory(bondingCurveFactoryAddress);
    console.log(`${contractNames.BondingCurveFactory} initialization tx:`, initializeTx.tx);
  } catch (e) {
    console.error(e);
  }

  process.exit();
};
