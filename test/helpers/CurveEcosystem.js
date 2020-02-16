const {CurveLogicType, TokenType, DeployMode} = require('../helpers/CurveEcosystemConfig');
const {bn, str} = require('./utils');
const {constants} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;
const deploy = require('../../index.js');
const {BaseEcosystem} = require('./BaseEcosystem');
const BondedToken = artifacts.require('BondedToken.sol');
const BondingCurve = artifacts.require('BondingCurve.sol');
const BondingCurveEther = artifacts.require('BondingCurveEther.sol');
const RewardsDistributor = artifacts.require('RewardsDistributor.sol');
const BancorCurveService = artifacts.require('BancorCurveService.sol');
const BancorCurveLogic = artifacts.require('BancorCurveLogic.sol');
const StaticCurveLogic = artifacts.require('StaticCurveLogic.sol');

class CurveEcosystem extends BaseEcosystem {
  async deployStaticCurveLogic() {
    const {curveLogicParams} = this.config.deployParams;
    const buyCurve = await StaticCurveLogic.new();
    await buyCurve.initialize(curveLogicParams.tokenRatio);
    return buyCurve;
  }

  async deployBancorCurveLogic() {
    const {curveLogicParams} = this.config.deployParams;

    const bancorService = await BancorCurveService.new();
    await bancorService.initialize();
    const buyCurve = await BancorCurveLogic.new();
    await BancorCurveLogic.initialize(bancorService.address, curveLogicParams.reserveRatio);

    return {
      bancorService,
      buyCurve
    };
  }

  async deployPaymentToken() {
    const {accounts} = this;
    const {collateralTokenParams} = this.config.deployParams;

    const paymentToken = await BondedToken.new();
    await paymentToken.initialize(
      collateralTokenParams.name,
      collateralTokenParams.symbol,
      collateralTokenParams.decimals,
      accounts.minter,
      ZERO_ADDRESS,
      str(0),
      ZERO_ADDRESS,
      ZERO_ADDRESS
    );

    const paymentTokenInitialBalance = bn(web3.utils.toWei('60000', 'ether'));

    await paymentToken.contract.methods
      .mint(accounts.minter, paymentTokenInitialBalance.toString())
      .send({from: accounts.minter});

    return paymentToken;
  }

  async init(web3) {
    const {collateralType, curveLogicType} = this.config.deployParams;
    if (collateralType === TokenType.ETHER) {
      return this.initEther(web3);
    }

    if (collateralType === TokenType.ERC20) {
      return this.initERC20(web3);
    }
  }

  async initShared(web3) {
    const {accounts} = this;
    const {curveParams, curveLogicType, bondedTokenParams} = this.config.deployParams;

    const rewardsDistributor = await RewardsDistributor.new();
    await rewardsDistributor.initialize(accounts.curveOwner);

    const bondedToken = await BondedToken.new();
    await bondedToken.initialize(
      bondedTokenParams.name,
      bondedTokenParams.symbol,
      bondedTokenParams.decimals,
      accounts.minter,
      ZERO_ADDRESS,
      str(0),
      rewardsDistributor.address,
      ZERO_ADDRESS
    );

    await rewardsDistributor.contract.methods
      .transferOwnership(bondedToken.address)
      .send({from: accounts.curveOwner});

    let buyCurve;

    if (curveLogicType === CurveLogicType.CONSTANT) {
      buyCurve = await this.deployStaticCurveLogic();
    } else if (curveLogicType === CurveLogicType.BANCOR) {
      buyCurve = (await this.deployBancorCurveLogic()).buyCurve;
    }

    return {
      rewardsDistributor,
      bondedToken,
      buyCurve
    };
  }

  async initEther(web3) {
    const {accounts} = this;
    const {curveParams, curveLogicType, bondedTokenParams} = this.config.deployParams;

    const {rewardsDistributor, bondedToken, buyCurve} = await this.initShared(web3);
    const bondingCurve = await BondingCurveEther.new();
    await bondingCurve.initialize(
      accounts.curveOwner,
      accounts.curveOwner,
      bondedToken.address,
      buyCurve.address,
      curveParams.reservePercentage,
      curveParams.dividendPercentage,
      str(0)
    );

    await bondedToken.contract.methods
      .addMinter(bondingCurve.address)
      .send({from: accounts.minter});
    await bondedToken.contract.methods.renounceMinter().send({from: accounts.minter});

    this.contracts = {
      bondingCurve,
      bondedToken,
      rewardsDistributor,
      buyCurve
    };

    return this.contracts;
  }

  async initERC20(web3) {
    const {accounts} = this;
    const {
      curveParams,
      curveLogicType,
      collateralType,
      bondedTokenParams,
      collateralTokenParams,
      curveLogicParams
    } = this.config.deployParams;
    // TODO: Use an ERC20Mintable instead of a BondedToken here!
    const paymentToken = await this.deployPaymentToken();
    const {rewardsDistributor, bondedToken, buyCurve} = await this.initShared(web3);

    const bondingCurve = await BondingCurve.new();
    await bondingCurve.initialize(
      accounts.curveOwner,
      accounts.curveOwner,
      paymentToken.address,
      bondedToken.address,
      buyCurve.address,
      curveParams.reservePercentage,
      curveParams.dividendPercentage,
      str(0)
    );

    await bondedToken.contract.methods
      .addMinter(bondingCurve.address)
      .send({from: accounts.minter});
    await bondedToken.contract.methods.renounceMinter().send({from: accounts.minter});

    this.contracts = {
      bondingCurve,
      bondedToken,
      paymentToken,
      rewardsDistributor,
      buyCurve
    };

    return this.contracts;
  }

  async getBondedTokenBalance(account) {
    return bn(await this.contracts.bondedToken.balanceOf(account));
  }

  async getBondedTokenTotalSupply() {
    return bn(await this.contracts.bondedToken.totalSupply());
  }
}

module.exports = {
  CurveEcosystem
};
