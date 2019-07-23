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

const BondingCurveFactory = artifacts.require('BondingCurveFactory');

contract('BondingCurveFactory', accounts => {
  let tx;
  let result;

  const zosContracts = getCurrentZosNetworkConfig().contracts;

  const staticCurveLogicImpl = zosContracts.StaticCurveLogic.address;
  const bancorCurveLogicImpl = zosContracts.BancorCurveLogic.address;
  const bondedTokenImpl = zosContracts.BondedToken.address;
  const bondingCurveImpl = zosContracts.BondingCurve.address;
  const dividendPoolImpl = zosContracts.DividendPool.address;

  const tokenParams = {
    name: 'PaymentToken',
    symbol: 'PAY',
    decimals: new BN(18)
  };

  let deployParams = {
    owner: accounts[0],
    beneficiary: accounts[0],
    buyCurveParams: new BN(100000000),
    sellCurveParams: new BN(10000000),
    collateralToken: null,
    splitOnPay: new BN(500000),
    bondedTokenName: 'BondedToken',
    bondedTokenSymbol: 'BND'
  };

  beforeEach(async function() {
    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(tokenParams.name, tokenParams.symbol, tokenParams.decimals);

    deployParams.collateralToken = this.paymentToken.address;

    const factoryAddress = await appCreate(
      'bc-dao',
      'BondingCurveFactory',
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

    this.factory = await BondingCurveFactory.at(factoryAddress);
  });

  it('should have parameters initialized correctly', async function() {
    result = await this.factory.getImplementations();

    expect(result.staticCurveLogicImpl).to.be.equal(staticCurveLogicImpl);
    expect(result.bancorCurveLogicImpl).to.be.equal(bancorCurveLogicImpl);
    expect(result.bondedTokenImpl).to.be.equal(bondedTokenImpl);
    expect(result.bondingCurveImpl).to.be.equal(bondingCurveImpl);
    expect(result.dividendPoolImpl).to.be.equal(dividendPoolImpl);
  });

  describe('Deploy Base', () => {
    let deployTx;

    beforeEach(async function() {
      deployTx = await this.factory.deploy([
        deployParams.owner,
        deployParams.beneficiary,
        deployParams.buyCurveParams,
        deployParams.sellCurveParams,
        deployParams.collateralToken,
        deployParams.splitOnPay,
        deployParams.bondedTokenName,
        deployParams.bondedTokenSymbol
      ]);
    });

    it('should emit deployed event', () => {
      expectEvent.inLogs(deployTx.logs, 'BondingCurveDeployed');
    });

    describe('Deploy', () => {
      let bondingCurve;
      let bondedToken;
      let buyCurve;
      let sellCurve;
      let dividendPool;

      beforeEach(async function() {
        const createdEvent = expectEvent.inLogs(deployTx.logs, 'BondingCurveDeployed');

        bondingCurve = await BondingCurve.at(createdEvent.args.bondingCurve);
        bondedToken = await BondedToken.at(createdEvent.args.bondedToken);
        buyCurve = await StaticCurveLogic.at(createdEvent.args.buyCurve);
        sellCurve = await StaticCurveLogic.at(createdEvent.args.sellCurve);
        dividendPool = await DividendPool.at(createdEvent.args.dividendPool);
      });

      it('should deploy contracts on deploy', async function() {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(bondedToken.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(buyCurve.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(sellCurve.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(dividendPool.address)).to.not.be.equal(nonContractCode);
      });

      it('should correctly initialize buy curve parameters', async function() {
        const tokenAmount = new BN(1000);
        const expectedPrice = new BN(100000);

        //TODO: Check reserve ratio when switching to bancor
        expect(await buyCurve.calcMintPrice(0, 0, tokenAmount)).to.be.bignumber.equal(
          expectedPrice
        );
      });

      it('should correctly initialize sell curve parameters', async function() {
        const tokenAmount = new BN(1000);
        const expectedReward = new BN(10000);

        //TODO: Check reserve ratio when switching to bancor
        expect(await sellCurve.calcMintPrice(0, 0, tokenAmount)).to.be.bignumber.equal(
          expectedReward
        );
      });

      it('should correctly initialize bonded token parameters', async function() {
        expect(await bondedToken.name()).to.be.equal(deployParams.bondedTokenName);
        expect(await bondedToken.symbol()).to.be.equal(deployParams.bondedTokenSymbol);
        expect(await bondedToken.decimals()).to.be.bignumber.equal(new BN(18));
        expect(await bondedToken.totalSupply()).to.be.bignumber.equal(new BN(0));
      });

      it('should correctly initialize dividend pool parameters', async function() {
        expect(await dividendPool.owner()).to.be.equal(deployParams.owner);
        expect(await dividendPool.token()).to.be.equal(deployParams.collateralToken);
      });

      it('should correctly initialize bonding curve parameters', async function() {
        expect(await bondingCurve.owner()).to.be.equal(deployParams.owner);
        expect(await bondingCurve.beneficiary()).to.be.equal(deployParams.beneficiary);
        expect(await bondingCurve.collateralToken()).to.be.equal(deployParams.collateralToken);
        expect(await bondingCurve.bondedToken()).to.be.equal(bondedToken.address);
        expect(await bondingCurve.buyCurve()).to.be.equal(buyCurve.address);
        expect(await bondingCurve.sellCurve()).to.be.equal(sellCurve.address);
        expect(await bondingCurve.splitOnPay()).to.be.bignumber.equal(deployParams.splitOnPay);
      });
    });
  });
});
