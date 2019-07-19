// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');

const {
  appCreate,
  getAppAddress,
  encodeCall,
  getZosConfig,
  getCurrentZosNetworkConfig
} = require('../testHelpers');

const PaymentToken = artifacts.require('StandaloneERC20');
const BondedToken = artifacts.require('BondedToken');
const BondingCurve = artifacts.require('BondingCurve');
const BancorCurveLogic = artifacts.require('BancorCurveLogic');
const StaticCurveLogic = artifacts.require('StaticCurveLogic');
const DividendPool = artifacts.require('DividendPool');

const TestFactory = artifacts.require('TestFactory');

contract('BondingCurveFactory', accounts => {
  let tx;
  let result;

  const tokenParams = {
    name: 'PaymentToken',
    symbol: 'PAY',
    decimals: new BN(18)
  };

  let deployParams = {
    owner: accounts[0],
    beneficiary: accounts[0],
    buyCurveParams: new BN(100000000),
    sellCurveParams: new BN(100000000),
    collateralToken: null,
    splitOnPay: new BN(500000),
    bondedTokenName: 'BondedToken',
    bondedTokenSymbol: 'BND'
  };

  beforeEach(async function() {
    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(tokenParams.name, tokenParams.symbol, tokenParams.decimals);

    deployParams.collateralToken = this.paymentToken.address;

    const zosContracts = getCurrentZosNetworkConfig().contracts;

    const staticCurveLogicImpl = zosContracts.StaticCurveLogic.address;
    const bancorCurveLogicImpl = zosContracts.BancorCurveLogic.address;
    const bondedTokenImpl = zosContracts.BondedToken.address;
    const bondingCurveImpl = zosContracts.BondingCurve.address;
    const dividendPoolImpl = zosContracts.DividendPool.address;

    const factoryAddress = await appCreate(
      'bc-dao',
      'TestFactory',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['address', 'address', 'address', 'address', 'address'],
        [
          staticCurveLogicImpl,
          bancorCurveLogicImpl,
          bondedTokenImpl,
          bondingCurveImpl,
          dividendPoolImpl
        ]
      )
    );

    this.factory = await TestFactory.at(factoryAddress);
  });

  it('should have parameters initialized correctly', async function() {
    result = await this.factory.getImplementations();
    console.log(result);
  });

  it('deploys contracts on combined deploy', async function() {
    tx = await this.factory.deploy(
      deployParams.owner,
      deployParams.beneficiary,
      deployParams.buyCurveParams,
      deployParams.sellCurveParams,
      deployParams.collateralToken,
      deployParams.splitOnPay,
      deployParams.bondedTokenName,
      deployParams.bondedTokenSymbol
    );
    console.log(tx.logs);

    const createdEvent = expectEvent.inLogs(tx.logs, 'BondingCurveDeployed');

    const bondingCurve = await BondingCurve.at(createdEvent.args.bondingCurve);
    const bondedToken = await BondedToken.at(createdEvent.args.bondedToken);
    const buyCurve = await StaticCurveLogic.at(createdEvent.args.buyCurve);
    const sellCurve = await StaticCurveLogic.at(createdEvent.args.sellCurve);
    const dividendPool = await DividendPool.at(createdEvent.args.dividendPool);

    // Call methods on all contracts to verify deployment

    expect(await bondedToken.totalSupply()).to.be.bignumber.equal(new BN(0));
    expect(await dividendPool.owner()).to.be.equal(deployParams.owner);
    expect(await bondingCurve.beneficiary()).to.be.equal(deployParams.beneficiary);
    expect(await buyCurve.calcMintPrice(100000, 100000, 1000)).to.be.bignumber.equal(new BN(0));
    expect(await sellCurve.calcMintPrice(10000, 10000, 10000)).to.be.bignumber.equal(new BN(0));
  });
});
