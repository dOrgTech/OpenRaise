const {BN} = require('openzeppelin-test-helpers');
const MAX_GAS = 0xffffffff;
const MAX_UINT = web3.utils.toTwosComplement('-1');
const WAD = new BN(10).pow(new BN(18));

const CurveTypes = {
  Static: 0,
  Bancor: 1
};

const CollateralTypes = {
  Ether: 0,
  ERC20: 1
};

const str = val => {
  return val.toString();
};

const bn = val => {
  return new BN(val.toString());
};

const toWad = val => {
  return new BN(val.toString()).mul(WAD);
};

module.exports = {
  str,
  bn,
  toWad,
  MAX_GAS,
  MAX_UINT,
  WAD,
  CurveTypes,
  CollateralTypes
};
