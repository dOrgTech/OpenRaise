// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

require('../setup');

const expectEvent = require('../expectEvent');

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');

const {ZWeb3} = require('@openzeppelin/upgrades');

const deploy = require('../../index.js');

const {paymentTokenValues} = require('../constants/tokenValues');

contract('BondingCurveFactory', accounts => {
  let tx;
  let result;

  let project;
  let factory;
  let paymentToken;
  let bancorCurveService;

  let staticCurveLogicImpl;
  let bancorCurveLogicImpl;
  let bondedTokenImpl;
  let bondingCurveImpl;
  let rewardsDistributorImpl;

  const adminAccount = accounts[0];
  const curveOwner = accounts[1];
  const tokenMinter = accounts[2];
  const userAccounts = accounts.slice(3, accounts.length);
  const miscUser = userAccounts[0];

  let deployParams = {
    owner: curveOwner,
    beneficiary: curveOwner,
    buyCurveParams: new BN(100000000),
    sellCurveParams: new BN(10000000),
    collateralToken: null,
    splitOnPay: new BN(50),
    bondedTokenName: 'BondedToken',
    bondedTokenSymbol: 'BND'
  };

  beforeEach(async function() {
    project = await deploy.setupApp({adminAccount});

    // TODO: replace this with an ERC20Mintable!
    paymentToken = await deploy.deployBondedToken(project, [
      paymentTokenValues.parameters.name,
      paymentTokenValues.parameters.symbol,
      paymentTokenValues.parameters.decimals,
      tokenMinter,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    ]);

    const paymentTokenInitialBalance = new BN(web3.utils.toWei('60000', 'ether'));

    await paymentToken.methods
      .mint(tokenMinter, paymentTokenInitialBalance.toString())
      .send({from: tokenMinter});

    deployParams.collateralToken = paymentToken.address;

    bancorCurveService = await deploy.deployBancorCurveService(project);

    staticCurveLogicImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.StaticCurveLogic
    );
    bancorCurveLogicImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.BancorCurveLogic
    );
    bondedTokenImpl = await deploy.getImplementation(project, deploy.CONTRACT_NAMES.BondedToken);
    bondingCurveImpl = await deploy.getImplementation(project, deploy.CONTRACT_NAMES.BondingCurve);
    rewardsDistributorImpl = await deploy.getImplementation(project, deploy.CONTRACT_NAMES.RewardsDistributor);

    factory = await deploy.deployBondingCurveFactory(project, [
      staticCurveLogicImpl,
      bancorCurveLogicImpl,
      bondedTokenImpl,
      bondingCurveImpl,
      bancorCurveService.address,
      rewardsDistributorImpl
    ]);
  });

  it('should have parameters initialized correctly', async function() {
    result = await factory.methods.getImplementations().call({from: miscUser});

    expect(result.staticCurveLogicImpl).to.be.equal(staticCurveLogicImpl);
    expect(result.bancorCurveLogicImpl).to.be.equal(bancorCurveLogicImpl);
    expect(result.bondedTokenImpl).to.be.equal(bondedTokenImpl);
    expect(result.bondingCurveImpl).to.be.equal(bondingCurveImpl);
    expect(result.rewardsDistributorImpl).to.be.equal(rewardsDistributorImpl);
    expect(result.bancorCurveServiceImpl).to.be.equal(bancorCurveService.address);
  });

  describe('Deploy StaticCurveLogic version', async () => {
    let deployTx;

    beforeEach(async function() {
      deployTx = await factory.methods
        .deployStatic(
          deployParams.owner,
          deployParams.beneficiary,
          deployParams.collateralToken,
          deployParams.buyCurveParams.toString(),
          deployParams.sellCurveParams.toString(),
          deployParams.splitOnPay.toString(),
          deployParams.bondedTokenName,
          deployParams.bondedTokenSymbol
        )
        .send({from: curveOwner});
    });

    it('should emit deployed event', async () => {
      const gasCost = deployTx.gasUsed;
      console.log('Deploy Cost', gasCost);

      expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');
    });

    describe('Deploy', () => {
      let bondingCurve;
      let bondedToken;
      let buyCurve;
      let sellCurve;
      let rewardsDistributor;

      beforeEach(async function() {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        sellCurve = deployedContracts.sellCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async function() {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(sellCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async function() {
        const tokenAmount = new BN(1000);
        const expectedPrice = new BN(100000);

        result = await buyCurve.methods
          .calcMintPrice(0, 0, tokenAmount.toString())
          .call({from: miscUser});

        expect(new BN(result)).to.be.bignumber.equal(expectedPrice);
      });

      it('should correctly initialize sell curve parameters', async function() {
        const tokenAmount = new BN(1000);
        const expectedReward = new BN(10000);

        //TODO: Check reserve ratio when switching to bancor
        expect(
          new BN(
            await sellCurve.methods
              .calcMintPrice(0, 0, tokenAmount.toString())
              .call({from: miscUser})
          )
        ).to.be.bignumber.equal(expectedReward);
      });

      it('should correctly initialize bonded token parameters', async function() {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          deployParams.bondedTokenName
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          deployParams.bondedTokenSymbol
        );
        expect(
          new BN(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(new BN(18));
        expect(
          new BN(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(new BN(0));
      });

      it('should correctly initialize reward distributor parameters', async function() {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async function() {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(
          deployParams.owner
        );
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          deployParams.beneficiary
        );
        expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
          deployParams.collateralToken
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(await bondingCurve.methods.sellCurve().call({from: miscUser})).to.be.equal(
          sellCurve.options.address
        );
        expect(
          new BN(await bondingCurve.methods.splitOnPay().call({from: miscUser}))
        ).to.be.bignumber.equal(deployParams.splitOnPay);
      });
    });
  });

  describe('Deploy BancorCurveLogic version', async () => {
    let deployTx;

    let bancorTestValues = {
      supply: new BN(1000000),
      connectorBalance: new BN(10000),
      connectorWeight: new BN(1000),
      depositAmount: new BN(10000),
      expectedResult: new BN(693)
    };

    beforeEach(async function() {
      deployTx = await factory.methods
        .deployBancor(
          deployParams.owner,
          deployParams.beneficiary,
          deployParams.collateralToken,
          bancorTestValues.connectorWeight.toString(),
          bancorTestValues.connectorWeight.toString(),
          deployParams.splitOnPay.toString(),
          deployParams.bondedTokenName,
          deployParams.bondedTokenSymbol
        )
        .send({from: curveOwner});
    });

    it('should emit deployed event', async () => {
      const gasCost = deployTx.gasUsed;
      console.log('Deploy Cost', gasCost);

      expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');
    });

    describe('Deploy', () => {
      let bondingCurve;
      let bondedToken;
      let buyCurve;
      let sellCurve;
      let rewardsDistributor;

      beforeEach(async function() {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        sellCurve = deployedContracts.sellCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async function() {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(sellCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async function() {
        //TODO: Check reserve ratio when switching to bancor
        expect(
          new BN(
            await buyCurve.methods
              .calcMintPrice(
                bancorTestValues.supply.toString(),
                bancorTestValues.connectorBalance.toString(),
                bancorTestValues.depositAmount.toString()
              )
              .call({from: miscUser})
          )
        ).to.be.bignumber.equal(bancorTestValues.expectedResult);
      });

      it('should correctly initialize sell curve parameters', async function() {
        //TODO: Check reserve ratio when switching to bancor
        expect(
          new BN(
            await sellCurve.methods
              .calcMintPrice(
                bancorTestValues.supply.toString(),
                bancorTestValues.connectorBalance.toString(),
                bancorTestValues.depositAmount.toString()
              )
              .call({from: miscUser})
          )
        ).to.be.bignumber.equal(bancorTestValues.expectedResult);
      });

      it('should correctly initialize bonded token parameters', async function() {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          deployParams.bondedTokenName
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          deployParams.bondedTokenSymbol
        );
        expect(
          new BN(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(new BN(18));
        expect(
          new BN(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(new BN(0));
      });

      it('should correctly initialize reward distributor parameters', async function() {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async function() {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(
          deployParams.owner
        );
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          deployParams.beneficiary
        );
        expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
          deployParams.collateralToken
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(await bondingCurve.methods.sellCurve().call({from: miscUser})).to.be.equal(
          sellCurve.options.address
        );
        expect(
          new BN(await bondingCurve.methods.splitOnPay().call({from: miscUser}))
        ).to.be.bignumber.equal(deployParams.splitOnPay);
      });
    });
  });
});

async function getContractsFromDeployedEvent(event) {
  let contracts = {
    bondingCurve: undefined,
    bondedToken: undefined,
    buyCurve: undefined,
    sellCurve: undefined,
    rewardsDistributor: undefined
  };

  contracts.bondingCurve = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.BondingCurve),
    await expectEvent.getParameter(event, 'bondingCurve')
  );
  contracts.bondedToken = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.BondedToken),
    await expectEvent.getParameter(event, 'bondedToken')
  );
  contracts.buyCurve = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.StaticCurveLogic),
    await expectEvent.getParameter(event, 'buyCurve')
  );
  contracts.sellCurve = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.StaticCurveLogic),
    await expectEvent.getParameter(event, 'sellCurve')
  );
  contracts.rewardsDistributor = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.RewardsDistributor),
    await expectEvent.getParameter(event, 'rewardsDistributor')
  );

  return contracts;
}
