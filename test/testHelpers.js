const fs = require('fs');
const {expectEvent} = require('openzeppelin-test-helpers');
const {encodeCall} = require('zos-lib');

const App = artifacts.require('App');

const constants = {
  BC_DAO_PACKAGE: '@dorg/bc-dao',
  STATIC_CURVE_LOGIC: 'StaticCurveLogic',
  BANCOR_CURVE_LOGIC: 'BancorCurveLogic',
  BONDED_TOKEN: 'BondedToken',
  DIVIDEND_POOL: 'DividendPool',
  BONDING_CURVE: 'BondingCurve',
  BONDING_CURVE_FACTORY: 'BondingCurveFactory',
  BANCOR_CURVE_SERVICE: 'BancorCurveService'
};

/*
 *  Find zos config file name for specified network
 *  Hacky: Assume public networks for known network IDs
 */
function resolveNetworkFilename(networkId) {
  switch (networkId) {
    case 1:
      return 'mainnet';
    case 3:
      return 'ropsten';
    case 4:
      return 'rinkeby';
    case 42:
      return 'kovan';
    default:
      return `dev-${networkId}`;
  }
}

/*
 *  Get zos config info for specified networkId.
 */
function getOZNetworkConfig(networkId) {
  const networkName = resolveNetworkFilename(networkId);
  const zosNetworkFile = fs.readFileSync(`./.openzeppelin/${networkName}.json`);

  return JSON.parse(zosNetworkFile);
}

function getOZConfig() {
  return JSON.parse(fs.readFileSync('./.openzeppelin/project.json'));
}

function getAppAddress() {
  const currentNetworkId = App.network_id;
  const zosNetworkConfig = getOZNetworkConfig(currentNetworkId);
  return zosNetworkConfig.app.address;
}

function getCurrentOZNetworkConfig() {
  const currentNetworkId = App.network_id;
  return getOZNetworkConfig(currentNetworkId);
}

// Helper function for creating instances via current App contract
async function appCreate(packageName, contractName, admin, data) {
  const appAddress = getAppAddress();

  const app = await App.at(appAddress);
  const tx = await app.create(packageName, contractName, admin, data);
  const createdEvent = expectEvent.inLogs(tx.logs, 'ProxyCreated');
  return createdEvent.args.proxy;
}

module.exports = {
  getOZConfig: getOZConfig,
  getOZNetworkConfig: getOZNetworkConfig,
  getCurrentOZNetworkConfig: getCurrentOZNetworkConfig,
  appCreate: appCreate,
  getAppAddress: getAppAddress,
  encodeCall: encodeCall,
  constants: constants
};
