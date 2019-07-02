const Migrations = artifacts.require("Migrations");

const BancorCurveLogicFactory = artifacts.require('BancorCurveLogicFactory');
const BondingCurveFactory = artifacts.require('BondingCurveFactory');
const DividendTokenFactory = artifacts.require('DividendTokenFactory');
const CombinedFactory = artifacts.require('CombinedFactory');

module.exports = async function(deployer) {
  await deployer.deploy(Migrations);
  const bancorCurveLogicFactory = await deployer.deploy(BancorCurveLogicFactory);
  const bondingCurveFactory = await deployer.deploy(BondingCurveFactory);
  const dividendTokenFactory = await deployer.deploy(DividendTokenFactory);
  const combinedFactory = await deployer.deploy(CombinedFactory, bancorCurveLogicFactory.address, bondingCurveFactory.address, dividendTokenFactory.address);
};
