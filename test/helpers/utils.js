const {BN} = require('openzeppelin-test-helpers');

const MAX_GAS = 0xffffffff;
const MAX_UINT = web3.utils.toTwosComplement('-1');
const WAD = new BN(10).pow(new BN(18));

const str = val => {
  return val.toString();
};

const bn = val => {
  return new BN(val.toString());
};

const wad = val => {
  return new BN(val.toString()).mul(WAD);
};

module.exports = {
  str,
  bn,
  MAX_GAS,
  MAX_UINT,
  WAD
};
