// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

require('../setup');

const expectEvent = require('../expectEvent');
const {expect} = require('chai');
const {ZWeb3} = require('@openzeppelin/upgrades');
const deploy = require('../../index.js');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');
const {str, bn, toWad, CurveTypes, CollateralTypes} = require('../helpers/utils');

contract('BondingCurveFactory', accounts => {
  let tx;
  let result;

  let project;
  let factory;
  let paymentToken;
  let bancorCurveService;

  let staticCurveLogicImpl;
  let bancorCurveLogicImpl;
  let polynomialCurveLogicImpl;
  let bondedTokenImpl;
  let bondedTokenEtherImpl;
  let bondingCurveImpl;
  let bondingCurveEtherImpl;
  let rewardsDistributorImpl;

  const adminAccount = accounts[0];
  const curveOwner = accounts[1];
  const tokenMinter = accounts[2];
  const userAccounts = accounts.slice(3, accounts.length);
  const miscUser = userAccounts[0];

  const {
    collateralTokenParams,
    curveLogicParams,
    curveParams,
    bondedTokenParams
  } = defaultTestConfig.deployParams;

  beforeEach(async () => {
    project = await deploy.setupApp({adminAccount});
    // TODO: replace this with an ERC20Mintable!
    paymentToken = await deploy.deployBondedToken(project, [
      collateralTokenParams.name,
      collateralTokenParams.symbol,
      collateralTokenParams.decimals,
      tokenMinter,
      ZERO_ADDRESS,
      str(0),
      ZERO_ADDRESS,
      ZERO_ADDRESS
    ]);

    const paymentTokenInitialBalance = bn(web3.utils.toWei('60000', 'ether'));
    await paymentToken.methods
      .mint(tokenMinter, paymentTokenInitialBalance.toString())
      .send({from: tokenMinter});

    bancorCurveService = await deploy.deployBancorCurveService(project);

    staticCurveLogicImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.StaticCurveLogic
    );
    bancorCurveLogicImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.BancorCurveLogic
    );
    polynomialCurveLogicImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.PolynomialCurveLogic
    );
    bondedTokenImpl = await deploy.getImplementation(project, deploy.CONTRACT_NAMES.BondedToken);
    bondedTokenEtherImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.BondedTokenEther
    );

    bondingCurveImpl = await deploy.getImplementation(project, deploy.CONTRACT_NAMES.BondingCurve);
    bondingCurveEtherImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.BondingCurveEther
    );

    rewardsDistributorImpl = await deploy.getImplementation(
      project,
      deploy.CONTRACT_NAMES.RewardsDistributor
    );

    factory = await deploy.deployBondingCurveFactory(project, [
      staticCurveLogicImpl,
      bancorCurveLogicImpl,
      polynomialCurveLogicImpl,
      bondedTokenImpl,
      bondedTokenEtherImpl,
      bondingCurveImpl,
      bondingCurveEtherImpl,
      rewardsDistributorImpl,
      bancorCurveService.address
    ]);
  });

  it('should have parameters initialized correctly', async () => {
    result = await factory.methods.getImplementations().call({from: miscUser});

    expect(result.staticCurveLogicImpl).to.be.equal(staticCurveLogicImpl);
    expect(result.bancorCurveLogicImpl).to.be.equal(bancorCurveLogicImpl);
    expect(result.polynomialCurveLogicImpl).to.be.equal(polynomialCurveLogicImpl);
    expect(result.bondedTokenImpl).to.be.equal(bondedTokenImpl);
    expect(result.bondedTokenEtherImpl).to.be.equal(bondedTokenEtherImpl);
    expect(result.bondingCurveImpl).to.be.equal(bondingCurveImpl);
    expect(result.bondingCurveEtherImpl).to.be.equal(bondingCurveEtherImpl);
    expect(result.rewardsDistributorImpl).to.be.equal(rewardsDistributorImpl);
    expect(result.bancorCurveServiceImpl).to.be.equal(bancorCurveService.address);
  });

  describe('Deploy: StaticCurveLogic + ERC20 Collateral', async () => {
    let deployTx;

    beforeEach(async () => {
      deployTx = await factory.methods
        .deploy(
          [CollateralTypes.ERC20, CurveTypes.Static],
          [curveOwner, curveOwner, paymentToken.address, curveOwner],
          [
            str(curveLogicParams.tokenRatio),
            str(curveParams.reservePercentage),
            str(curveParams.dividendPercentage),
            str(curveParams.preMintAmount)
          ],
          bondedTokenParams.name,
          bondedTokenParams.symbol
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
      let rewardsDistributor;

      beforeEach(async () => {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async () => {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        const tokenAmount = bn(1000);
        const expectedPrice = bn(100000);

        result = await buyCurve.methods
          .calcMintPrice(0, 0, tokenAmount.toString())
          .call({from: miscUser});

        expect(bn(result)).to.be.bignumber.equal(expectedPrice);
      });

      it('should correctly initialize bonded token parameters', async () => {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );
        expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
          paymentToken.options.address
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
        expect(
          bn(await bondingCurve.methods.preMintAmount().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.preMintAmount);
      });
    });
  });

  describe('Deploy: StaticCurveLogic + Ether Collateral', async () => {
    let deployTx;

    beforeEach(async () => {
      deployTx = await factory.methods
        .deploy(
          [CollateralTypes.Ether, CurveTypes.Static],
          [curveOwner, curveOwner, ZERO_ADDRESS, curveOwner],
          [
            str(curveLogicParams.tokenRatio),
            str(curveParams.reservePercentage),
            str(curveParams.dividendPercentage),
            str(curveParams.preMintAmount)
          ],
          bondedTokenParams.name,
          bondedTokenParams.symbol
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
      let rewardsDistributor;

      beforeEach(async () => {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async () => {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        const tokenAmount = bn(1000);
        const expectedPrice = bn(100000);

        result = await buyCurve.methods
          .calcMintPrice(0, 0, tokenAmount.toString())
          .call({from: miscUser});

        expect(bn(result)).to.be.bignumber.equal(expectedPrice);
      });

      it('should correctly initialize bonded token parameters', async () => {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
      });
    });
  });

  describe('Deploy BancorCurveLogic + ERC20 Collateral', async () => {
    let deployTx;

    let bancorTestValues = {
      supply: bn(1000000),
      connectorBalance: bn(10000),
      connectorWeight: bn(1000),
      depositAmount: bn(10000),
      expectedResult: bn(693)
    };

    beforeEach(async () => {
      deployTx = await factory.methods
        .deploy(
          [CollateralTypes.ERC20, CurveTypes.Bancor],
          [curveOwner, curveOwner, paymentToken.options.address, curveOwner],
          [
            str(bancorTestValues.connectorWeight),
            str(curveParams.reservePercentage),
            str(curveParams.dividendPercentage),
            str(curveParams.preMintAmount)
          ],
          bondedTokenParams.name,
          bondedTokenParams.symbol
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
      let rewardsDistributor;

      beforeEach(async () => {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async () => {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        //TODO: Check reserve ratio when switching to bancor
        expect(
          bn(
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

      it('should correctly initialize bonded token parameters', async () => {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );
        expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
          paymentToken.options.address
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
      });
    });
  });

  describe('Deploy BancorCurveLogic + Ether Collateral', async () => {
    let deployTx;

    let bancorTestValues = {
      supply: bn(1000000),
      connectorBalance: bn(10000),
      connectorWeight: bn(1000),
      depositAmount: bn(10000),
      expectedResult: bn(693)
    };

    beforeEach(async () => {
      deployTx = await factory.methods
        .deploy(
          [CollateralTypes.Ether, CurveTypes.Bancor],
          [curveOwner, curveOwner, paymentToken.options.address, curveOwner],
          [
            str(bancorTestValues.connectorWeight),
            str(curveParams.reservePercentage),
            str(curveParams.dividendPercentage),
            str(curveParams.preMintAmount)
          ],
          bondedTokenParams.name,
          bondedTokenParams.symbol
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
      let rewardsDistributor;

      beforeEach(async () => {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async () => {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        //TODO: Check reserve ratio when switching to bancor
        expect(
          bn(
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

      it('should correctly initialize bonded token parameters', async () => {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );
        expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
          paymentToken.options.address
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
      });
    });
  });

  describe('Deploy: PolynomialCurveLogic + ERC20 Collateral', async () => {
    let deployTx;

    beforeEach(async () => {
      deployTx = await factory.methods
        .deploy(
          [CollateralTypes.ERC20, CurveTypes.Polynomial],
          [curveOwner, curveOwner, paymentToken.address, curveOwner],
          [
            str(1),
            str(curveParams.reservePercentage),
            str(curveParams.dividendPercentage),
            str(curveParams.preMintAmount)
          ],
          bondedTokenParams.name,
          bondedTokenParams.symbol
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
      let rewardsDistributor;

      beforeEach(async () => {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async () => {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        const tokenAmount = bn(1000);
        const expectedPrice = bn(100000);

        result = await buyCurve.methods
          .calcMintPrice(0, 0, tokenAmount.toString())
          .call({from: miscUser});

        expect(bn(result)).to.be.bignumber.equal(expectedPrice);
      });

      it('should correctly initialize bonded token parameters', async () => {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );
        expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
          paymentToken.options.address
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
        expect(
          bn(await bondingCurve.methods.preMintAmount().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.preMintAmount);
      });
    });
  });

  describe('Deploy: PolynomialCurveLogic + Ether Collateral', async () => {
    let deployTx;

    beforeEach(async () => {
      deployTx = await factory.methods
        .deploy(
          [CollateralTypes.Ether, CurveTypes.Polynomial],
          [curveOwner, curveOwner, ZERO_ADDRESS, curveOwner],
          [
            str(1),
            str(curveParams.reservePercentage),
            str(curveParams.dividendPercentage),
            str(curveParams.preMintAmount)
          ],
          bondedTokenParams.name,
          bondedTokenParams.symbol
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
      let rewardsDistributor;

      beforeEach(async () => {
        const createdEvent = expectEvent.inLogs(deployTx.events, 'BondingCurveDeployed');

        const deployedContracts = await getContractsFromDeployedEvent(createdEvent);

        bondingCurve = deployedContracts.bondingCurve;
        bondedToken = deployedContracts.bondedToken;
        buyCurve = deployedContracts.buyCurve;
        rewardsDistributor = deployedContracts.rewardsDistributor;
      });

      it('should deploy contracts on deploy', async () => {
        //Just verify that code exists at the address
        let nonContractCode = '0x';

        expect(await web3.eth.getCode(bondingCurve.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(bondedToken.options.address)).to.not.be.equal(
          nonContractCode
        );
        expect(await web3.eth.getCode(buyCurve.options.address)).to.not.be.equal(nonContractCode);
        expect(await web3.eth.getCode(rewardsDistributor.options.address)).to.not.be.equal(
          nonContractCode
        );
      });

      it('should correctly initialize buy curve parameters', async () => {
        const tokenAmount = bn(1000);
        const expectedPrice = bn(1000);

        result = await buyCurve.methods
          .calcMintPrice(0, 0, tokenAmount.toString())
          .call({from: miscUser});

        expect(bn(result)).to.be.bignumber.equal(expectedPrice);
      });

      it('should correctly initialize bonded token parameters', async () => {
        expect(await bondedToken.methods.name().call({from: miscUser})).to.be.equal(
          bondedTokenParams.name
        );
        expect(await bondedToken.methods.symbol().call({from: miscUser})).to.be.equal(
          bondedTokenParams.symbol
        );
        expect(
          bn(await bondedToken.methods.decimals().call({from: miscUser}))
        ).to.be.bignumber.equal(bn(18));
        expect(
          bn(await bondedToken.methods.totalSupply().call({from: miscUser}))
        ).to.be.bignumber.equal(str(curveParams.preMintAmount));
      });

      it('should correctly initialize reward distributor parameters', async () => {
        expect(await rewardsDistributor.methods.owner().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
      });

      it('should correctly initialize bonding curve parameters', async () => {
        expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
        expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
          curveOwner
        );
        expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
          bondedToken.options.address
        );
        expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
          buyCurve.options.address
        );
        expect(
          bn(await bondingCurve.methods.reservePercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.reservePercentage);
        expect(
          bn(await bondingCurve.methods.dividendPercentage().call({from: miscUser}))
        ).to.be.bignumber.equal(curveParams.dividendPercentage);
      });
    });
  });
});

async function getContractsFromDeployedEvent(event) {
  let contracts = {
    bondingCurve: undefined,
    bondedToken: undefined,
    buyCurve: undefined,
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
  contracts.rewardsDistributor = await ZWeb3.contract(
    await deploy.getAbi(deploy.CONTRACT_NAMES.RewardsDistributor),
    await expectEvent.getParameter(event, 'rewardsDistributor')
  );

  return contracts;
}
