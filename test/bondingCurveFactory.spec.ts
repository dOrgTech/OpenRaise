// Import all required modules from openzeppelin-test-helpers
const { BN, constants, expectEvent, expectRevert } = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const { expect } = require('chai');

const TestToken = artifacts.require('TestToken');
const DividendToken = artifacts.require('TestToken');
const BondingCurve = artifacts.require('TestToken');
const ICurveLogic = artifacts.require('TestToken');

const BancorCurveLogicFactory = artifacts.require('BancorCurveLogicFactory');
const BondingCurveFactory = artifacts.require('BondingCurveFactory');
const DividendTokenFactory = artifacts.require('DividendTokenFactory');
const CombinedFactory = artifacts.require('CombinedFactory');
const MergedFactory = artifacts.require('MergedFactory');

contract('BondingCurveFactory', ([sender, receiver]) => {
    beforeEach(async function () {
        this.erc20 = await TestToken.new('PaymentToken', 'PAY', 18);

        this.bancorCurveLogicFactory = await BancorCurveLogicFactory.new();
        this.bondingCurveFactory = await BondingCurveFactory.new();
        this.dividendTokenFactory = await DividendTokenFactory.new();
        console.log(this.bancorCurveLogicFactory.address, this.bondingCurveFactory.address, this.dividendTokenFactory.address);
        this.mergedFactory = await MergedFactory.new(this.bancorCurveLogicFactory.address, this.bondingCurveFactory.address, this.dividendTokenFactory.address);
        this.combinedFactory = await CombinedFactory.new(this.bancorCurveLogicFactory.address, this.bondingCurveFactory.address, this.dividendTokenFactory.address);
    });

    it('emits Created events on individual deploys', async function () {
        let result = await this.bancorCurveLogicFactory.deploy(100, { from: sender });

        expectEvent.inLogs(result.logs, 'BancorCurveLogicDeployed', { sender: sender });

        result = await this.dividendTokenFactory.deploy(
            'BondedToken',
            'BND',
            18,
            sender,
            this.erc20.address,
            true,
            { from: sender }
        );

        expectEvent.inLogs(result.logs, 'DividendTokenDeployed', { sender: sender });

        result = await this.bondingCurveFactory.deploy(
            this.erc20.address,
            sender,
            sender, //buy
            sender, //sell
            sender, //bondedToken
            50,
            { from: sender }
        );

        expectEvent.inLogs(result.logs, 'BondingCurveDeployed', { sender: sender });
    });

    it('emits Created events on combined deploy', async function () {
        // let result = await this.mergedFactory.deploy(
        //     'BondedToken',
        //     'BND',
        //     18,
        //     sender,
        //     1000,
        //     500,
        //     this.erc20.address,
        //     40,
        //     { from: sender }
        // );

        // console.log(result.logs);
    });

    it('deploys contracts on individual deploys', async function () {
        // let result = await this.bancorCurveLogicFactory.deploy(100, { from: sender });

        // const curveLogicAddress = result.logs[0].args.deployedAddress;

        // result = await this.dividendTokenFactory.deploy(
        //     'BondedToken',
        //     'BND',
        //     18,
        //     sender,
        //     this.erc20.address,
        //     true,
        //     { from: sender }
        // );

        // const dividendTokenAddress = result.logs[0].args.deployedAddress;

        // result = await this.bondingCurveFactory.deploy(
        //     this.erc20.address,
        //     sender,
        //     sender, //buy
        //     sender, //sell
        //     sender, //bondedToken
        //     50,
        //     { from: sender }
        // );

        // const bondingCurveAddress = result.logs[0].args.deployedAddress;
        // console.log(curveLogicAddress, dividendTokenAddress, bondingCurveAddress);
    });

    it('deploys contracts on combined deploy', async function () {
        //Get the address of each contract and try to interact with it
    });
});