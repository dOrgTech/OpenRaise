const {CurveLogicType, CollateralType} = require("../helpers/CurveEcosystemConfig");
const {bn} = require("./utils");
const {constants} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;
const deploy = require('../../index.js');

const BondedToken = artifacts.require('BondedToken.sol');
const BondingCurve = artifacts.require('BondingCurve.sol');
const RewardsDistributor = artifacts.require('RewardsDistributor.sol');
const BancorCurveService = artifacts.require('BancorCurveService.sol');
const BancorCurveLogic = artifacts.require('BancorCurveLogic.sol');
const StaticCurveLogic = artifacts.require('StaticCurveLogic.sol');

class CurveEcosystem {
    constructor(accounts, config) {
        this.config = config;
        this.accounts = accounts;
        this.contracts = {};
    }

    async init(web3) {
        const accounts = this.accounts;
        const {curveParams, curveLogicType, collateralType, bondedTokenParams, collateralTokenParams, curveLogicParams} = this.config.deployParams;
        // TODO: Use an ERC20Mintable instead of a BondedToken here!
        const paymentToken = await BondedToken.new();
        await paymentToken.initialize(
            collateralTokenParams.name,
            collateralTokenParams.symbol,
            collateralTokenParams.decimals,
            accounts.minter,
            ZERO_ADDRESS,
            ZERO_ADDRESS);

        const paymentTokenInitialBalance = bn(web3.utils.toWei('60000', 'ether'));

        await paymentToken.contract.methods
            .mint(accounts.minter, paymentTokenInitialBalance.toString())
            .send({from: accounts.minter});

        const rewardsDistributor = await RewardsDistributor.new();
        await rewardsDistributor.initialize(accounts.curveOwner);

        const bondedToken = await BondedToken.new();
        await bondedToken.initialize(
            bondedTokenParams.name,
            bondedTokenParams.symbol,
            bondedTokenParams.decimals,
            accounts.minter,
            rewardsDistributor.address,
            paymentToken.address);

        await rewardsDistributor.contract.methods
            .transferOwnership(bondedToken.address)
            .send({from: accounts.curveOwner});

        let buyCurve;

        if (curveLogicType === CurveLogicType.STATIC) {
            buyCurve = await StaticCurveLogic.new();
            await buyCurve.initialize(curveLogicParams.tokenRatio);
        } else if (curveLogicType === CurveLogicType.BANCOR) {
            const bancorService = await BancorCurveService.new();
            await bancorService.initialize();
            buyCurve = await BancorCurveLogic.new()
            await BancorCurveLogic.initialize(bancorService.address,
                curveLogicParams.reserveRatio);
        }

        const bondingCurve = await BondingCurve.new();
        await bondingCurve.initialize(accounts.curveOwner,
            accounts.curveOwner,
            paymentToken.address,
            bondedToken.address,
            buyCurve.address,
            curveParams.reservePercentage,
            curveParams.dividendPercentage);

        await bondedToken.contract.methods.addMinter(bondingCurve.address).send({from: accounts.minter});
        await bondedToken.contract.methods.renounceMinter().send({from: accounts.minter});

        this.contracts = {
            bondingCurve,
            bondedToken,
            paymentToken,
            rewardsDistributor,
            buyCurve
        }

        return this.contracts;
    }

    async bulkMint(token, minter, accounts, amount) {
        for (const account of accounts) {
            await token.mint(account, amount, {from: minter});
        }
    }

    async bulkApprove(token, recipient, accounts, amount) {
        for (const account of accounts) {
            await token.approve(recipient, amount, {from: account});
        }
    }
}

module.exports = {
    CurveEcosystem
}