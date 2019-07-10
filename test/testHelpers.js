const fs = require("fs");
const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("openzeppelin-test-helpers");
const App = artifacts.require("App");
const { encodeCall } = require("zos-lib");

/*
 *  Find zos config file name for specified network
 *  Hacky: Assume public networks for known network IDs
 */
function resolveNetworkFilename(networkId) {
  switch (networkId) {
    case 1:
      return "mainnet";
    case 3:
      return "ropsten";
    case 4:
      return "rinkeby";
    case 42:
      return "kovan";
    default:
      return `dev-${networkId}`;
  }
}

/*
 *  Get zos config info for specified networkId.
 */
function getZosNetworkConfig(networkId) {
  const networkName = resolveNetworkFilename(networkId);
  const zosNetworkFile = fs.readFileSync(`./zos.${networkName}.json`);

  return JSON.parse(zosNetworkFile);
}

function getZosConfig() {
  return JSON.parse(fs.readFileSync("./zos.json"));
}

function getAppAddress() {
  const currentNetworkId = App.network_id;
  const zosNetworkConfig = getZosNetworkConfig(currentNetworkId);
  return zosNetworkConfig.app.address;
}

function getCurrentZosNetworkConfig() {
  const currentNetworkId = App.network_id;
  return getZosNetworkConfig(currentNetworkId);
}

// Helper function for creating instances via current App contract
async function appCreate(packageName, contractName, admin, data) {
  const currentNetworkId = App.network_id;
  const zosNetworkConfig = getZosNetworkConfig(currentNetworkId);
  const appAddress = zosNetworkConfig.app.address;

  const app = await App.at(appAddress);
  const tx = await app.create(packageName, contractName, admin, data);
  const createdEvent = expectEvent.inLogs(tx.logs, "ProxyCreated");
  return createdEvent.args.proxy;
}

module.exports.getZosConfig = getZosConfig;
module.exports.getZosNetworkConfig = getZosNetworkConfig;
module.exports.getCurrentZosNetworkConfig = getCurrentZosNetworkConfig;
module.exports.appCreate = appCreate;
module.exports.getAppAddress = getAppAddress;
module.exports.encodeCall = encodeCall;
