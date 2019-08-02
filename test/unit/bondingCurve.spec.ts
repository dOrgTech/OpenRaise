// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const lib = require('zos-lib');

const helpers = require('../testHelpers');

const PaymentToken = artifacts.require('StandaloneERC20');
const BondedToken = artifacts.require('BondedToken');
const BondingCurve = artifacts.require('BondingCurve');
const DividendPool = artifacts.require('DividendPool');
const StaticCurveLogic = artifacts.require('StaticCurveLogic');
const BondingCurveFactory = artifacts.require('BondingCurveFactory');

const App = artifacts.require('App');

const PAY_EVENT = 'Pay';

/*
  Uses StaticCurveLogic for simpler tests.
*/

contract('Bonding Curve', accounts => {
  let tx;
  let result;

  let paymentToken;
  let dividendPool;
  let bondedToken;
  let bondingCurve;
  let buyCurve;
  let sellCurve;

  const defaultAccount = accounts[0];
  const curveOwner = accounts[1];
  const tokenMinter = accounts[2];
  const userAccounts = accounts.slice(3, accounts.length);

  let deployParams = {
    owner: curveOwner,
    beneficiary: curveOwner,
    buyCurveParams: new BN(100000000), //1 bondedToken minted for every 100 collateralTokens sent
    sellCurveParams: new BN(10000000), //10 collateralTokens returned for every bondedToken burned
    collateralToken: null,
    splitOnPay: new BN(50),
    bondedTokenName: 'BondedToken',
    bondedTokenSymbol: 'BND'
  };

  const tokenRatioPrecision = new BN(1000000);

  let values = {
    paymentToken: {
      name: 'PaymentToken',
      symbol: 'PAY',
      decimals: new BN(18)
    },
    bondedToken: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: new BN(18)
    }
  };

  beforeEach(async function() {
    //Initial supply starts with sender who can also mint
    paymentToken = await PaymentToken.new();
    paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals,
      new BN(web3.utils.toWei('60000', 'ether')),
      tokenMinter,
      [tokenMinter],
      [tokenMinter]
    );

    dividendPool = await DividendPool.at(
      await helpers.appCreate(
        helpers.constants.BC_DAO_PACKAGE,
        helpers.constants.DIVIDEND_POOL,
        constants.ZERO_ADDRESS,
        '0x'
      )
    );

    buyCurve = await StaticCurveLogic.at(
      await helpers.appCreate(
        helpers.constants.BC_DAO_PACKAGE,
        helpers.constants.STATIC_CURVE_LOGIC,
        constants.ZERO_ADDRESS,
        '0x'
      )
    );

    sellCurve = await StaticCurveLogic.at(
      await helpers.appCreate(
        helpers.constants.BC_DAO_PACKAGE,
        helpers.constants.STATIC_CURVE_LOGIC,
        constants.ZERO_ADDRESS,
        '0x'
      )
    );

    bondedToken = await BondedToken.at(
      await helpers.appCreate(
        helpers.constants.BC_DAO_PACKAGE,
        helpers.constants.BONDED_TOKEN,
        constants.ZERO_ADDRESS,
        '0x'
      )
    );

    bondingCurve = await BondingCurve.at(
      await helpers.appCreate(
        helpers.constants.BC_DAO_PACKAGE,
        helpers.constants.BONDING_CURVE,
        constants.ZERO_ADDRESS,
        '0x'
      )
    );

    await dividendPool.initialize(paymentToken.address, curveOwner);
    await buyCurve.initialize(deployParams.buyCurveParams);
    await sellCurve.initialize(deployParams.sellCurveParams);
    await bondedToken.initialize(
      deployParams.bondedTokenName,
      deployParams.bondedTokenSymbol,
      18,
      bondingCurve.address
    );
    await bondingCurve.initialize(
      curveOwner,
      curveOwner,
      paymentToken.address,
      bondedToken.address,
      buyCurve.address,
      sellCurve.address,
      dividendPool.address,
      deployParams.splitOnPay
    );
  });

  describe('Initialization', async () => {
    it('should have properly initialized parameters', async function() {
      expect(await bondingCurve.owner()).to.be.equal(curveOwner);
      expect(await bondingCurve.beneficiary()).to.be.equal(curveOwner);
      expect(await bondingCurve.collateralToken()).to.be.equal(paymentToken.address);
      expect(await bondingCurve.bondedToken()).to.be.equal(bondedToken.address);
      expect(await bondingCurve.buyCurve()).to.be.equal(buyCurve.address);
      expect(await bondingCurve.sellCurve()).to.be.equal(sellCurve.address);
      expect(await bondingCurve.dividendPool()).to.be.equal(dividendPool.address);
      expect(await bondingCurve.splitOnPay()).to.be.bignumber.equal(deployParams.splitOnPay);
    });
  });

  describe('Curve Admin', async () => {
    it('should allow owner to set new beneficiary', async function() {
      tx = await bondingCurve.setBeneficiary(userAccounts[0], {from: curveOwner});
      expect(await bondingCurve.beneficiary()).to.be.equal(userAccounts[0]);
    });

    it('should not allow non-owner to set new beneficiary', async function() {
      await expectRevert.unspecified(
        bondingCurve.setBeneficiary(constants.ZERO_ADDRESS, {
          from: userAccounts[0]
        })
      );
    });

    it('should allow owner to set new owner', async function() {
      const oldOwner = curveOwner;
      const newOwner = userAccounts[0];

      tx = await bondingCurve.transferOwnership(newOwner, {from: oldOwner});
      expect(await bondingCurve.owner()).to.be.equal(newOwner);
    });

    it('should not allow non-owner to set new owner', async function() {
      const nonOwner = userAccounts[0];
      const newOwner = userAccounts[1];

      await expectRevert.unspecified(
        bondingCurve.transferOwnership(newOwner, {
          from: nonOwner
        })
      );
    });

    it('should not allow old owner to set new beneficiary after ownership transfer', async function() {
      const oldOwner = curveOwner;
      const oldBeneficiary = curveOwner;
      const newOwner = userAccounts[0];
      const newBeneficiary = userAccounts[1];

      tx = await bondingCurve.transferOwnership(newOwner, {from: oldOwner});

      result = await bondingCurve.beneficiary();
      expect(result).to.be.equal(oldBeneficiary);

      await bondingCurve.setBeneficiary(newBeneficiary, {from: newOwner});

      result = await bondingCurve.beneficiary();
      expect(result).to.be.equal(newBeneficiary);
    });
  });

  describe('Buy / Sell', async () => {
    const buyer = userAccounts[0];

    const userBalances = new BN(100000000);
    const approvalAmount = new BN(100000000);

    const numTokens = new BN(100000);

    const expectedBuyPrice = numTokens.mul(deployParams.buyCurveParams).div(tokenRatioPrecision);
    const expectedSellReward = numTokens.mul(deployParams.sellCurveParams).div(tokenRatioPrecision);
    const maxBuyPrice = new BN(0); //We don't want a max price unless we're specifically testing that
    const minSellPrice = new BN(0); //We don't want a min price unless we're specifically testing that

    it('should show buy price correctly', async function() {
      result = await bondingCurve.priceToBuy(numTokens);

      expect(result).to.be.bignumber.equal(expectedBuyPrice);
    });

    it('should show sell reward correctly', async function() {
      result = await bondingCurve.rewardForSell(numTokens);

      expect(result).to.be.bignumber.equal(expectedSellReward);
    });

    it('should not allow bondingCurve owner to mint bondedTokens', async function() {
      await expectRevert.unspecified(bondedToken.mint(curveOwner, 100, {from: curveOwner}));
    });

    it('should not allow other addresses to mint bondedTokens', async function() {
      await expectRevert.unspecified(bondedToken.mint(curveOwner, 100, {from: curveOwner}));
    });

    describe('Buy Failure Cases', async () => {
      it('should not allow to buy with 0 tokens specified', async function() {
        await expectRevert.unspecified(bondingCurve.buy(0, maxBuyPrice, buyer, {from: buyer}));
      });

      it('should not allow user without collateralTokens approved to buy bondedTokens', async function() {
        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer})
        );
      });

      it('should not allow buy if current price exceeds specified max price', async function() {});
      it('should not allow to buy if sell curve value is higher than buy curve value', async function() {});
    });

    describe('Buy', async () => {
      beforeEach(async () => {
        await paymentToken.mint(curveOwner, userBalances, {from: tokenMinter});
        await paymentToken.mint(buyer, userBalances, {from: tokenMinter});
        await paymentToken.approve(bondingCurve.address, approvalAmount, {from: curveOwner});
        await paymentToken.approve(bondingCurve.address, approvalAmount, {from: buyer});
      });

      it('should mint bondedTokens correctly on buy', async function() {
        const beforeBalance = await bondedToken.balanceOf(buyer);
        tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer});

        const afterBalance = await bondedToken.balanceOf(buyer);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(numTokens));
      });

      it('should transfer collateral tokens from buyer correctly on buy', async function() {
        const beforeBalance = await paymentToken.balanceOf(buyer);

        tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer});

        const afterBalance = await paymentToken.balanceOf(buyer);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedBuyPrice));
      });

      it('should transfer collateral tokens to reserve correctly on buy', async function() {
        const beforeBalance = await paymentToken.balanceOf(bondingCurve.address);
        tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer});

        const event = expectEvent.inLogs(tx.logs, 'Buy');

        const afterBalance = await paymentToken.balanceOf(bondingCurve.address);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(event.args.reserveAmount));
      });

      it('should transfer collateral tokens to beneficiary correctly on buy', async function() {
        const beforeBalance = await paymentToken.balanceOf(deployParams.beneficiary);
        tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer});

        const event = expectEvent.inLogs(tx.logs, 'Buy');

        const afterBalance = await paymentToken.balanceOf(deployParams.beneficiary);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(event.args.beneficiaryAmount));
      });

      it('should register buy event on buy', async function() {
        tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer});

        //Verify events
        expectEvent.inLogs(tx.logs, 'Buy', {
          buyer: buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow user to buy for a different recipient', async function() {});
    });

    describe('Sell Failure Cases', async () => {
      it('should not allow to sell with 0 tokens specified', async function() {
        await expectRevert.unspecified(bondingCurve.sell(0, maxBuyPrice, buyer, {from: buyer}));
      });

      it('should not allow user without bondedTokens to sell', async function() {
        await expectRevert.unspecified(
          bondingCurve.sell(numTokens, minSellPrice, buyer, {from: buyer})
        );
      });

      it('should not allow sell if current price is lower than specified min price', async function() {});
    });

    describe('Sell', async () => {
      beforeEach(async () => {
        await paymentToken.mint(curveOwner, userBalances, {from: tokenMinter});
        await paymentToken.mint(buyer, userBalances, {from: tokenMinter});
        await paymentToken.approve(bondingCurve.address, approvalAmount, {from: curveOwner});
        await paymentToken.approve(bondingCurve.address, approvalAmount, {from: buyer});
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer});
      });

      it('should allow user with bondedTokens to sell all bondedTokens', async function() {
        tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {from: buyer});

        expectEvent.inLogs(tx.logs, 'Sell', {
          seller: buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow user with bondedTokens to sell some bondedTokens', async function() {
        const tokensToSell = numTokens.div(new BN(2));

        tx = await bondingCurve.sell(tokensToSell, minSellPrice, buyer, {from: buyer});

        expectEvent.inLogs(tx.logs, 'Sell', {
          seller: buyer,
          recipient: buyer,
          amount: tokensToSell
        });
      });

      it('should burn tokens from seller on sell', async function() {
        const beforeBalance = await bondedToken.balanceOf(buyer);

        tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {from: buyer});

        const afterBalance = await bondedToken.balanceOf(buyer);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(numTokens));
      });

      it('should transfer collateral tokens from reserve on sell', async function() {
        const beforeBalance = await paymentToken.balanceOf(bondingCurve.address);

        tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {from: buyer});

        const afterBalance = await paymentToken.balanceOf(bondingCurve.address);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedSellReward));
      });

      it('should transfer collateral tokens to seller on sell', async function() {
        const beforeBalance = await paymentToken.balanceOf(buyer);

        tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {from: buyer});

        const afterBalance = await paymentToken.balanceOf(buyer);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(expectedSellReward));
      });

      it('should allow user sell with a different recipient', async function() {});
    });
  });

  describe('Payments', async () => {
    const nonOwner = userAccounts[0];

    const userBalances = new BN(100000);
    const paymentAmount = new BN(10000);

    beforeEach(async () => {
      await paymentToken.mint(curveOwner, userBalances, {from: tokenMinter});
      await paymentToken.mint(nonOwner, userBalances, {from: tokenMinter});
      await paymentToken.approve(bondingCurve.address, paymentAmount, {from: curveOwner});
      await paymentToken.approve(bondingCurve.address, paymentAmount, {from: nonOwner});
    });

    it('should not allow payments of amount 0', async function() {
      await expectRevert.unspecified(bondingCurve.pay(0, {from: curveOwner}));
    });

    it('should register payments', async function() {
      tx = await bondingCurve.pay(paymentAmount, {from: nonOwner});

      expectEvent.inLogs(tx.logs, PAY_EVENT, {
        from: nonOwner,
        token: paymentToken.address,
        amount: paymentAmount
      });

      tx = await bondingCurve.pay(paymentAmount, {from: curveOwner});

      expectEvent.inLogs(tx.logs, PAY_EVENT, {
        from: curveOwner,
        token: paymentToken.address,
        amount: paymentAmount
      });
    });

    it('should not allow pay with greater amount than senders balance', async function() {
      await expectRevert.unspecified(
        bondingCurve.pay(userBalances.add(userBalances), {from: nonOwner})
      );
      await expectRevert.unspecified(
        bondingCurve.pay(userBalances.add(userBalances), {from: curveOwner})
      );
    });

    describe('Beneficiary / Dividend Split', async () => {
      const maxPercentage = new BN(100);
      const dividendSplit = maxPercentage.sub(deployParams.splitOnPay);
      const expectedBeneficiaryAmount = paymentAmount
        .mul(deployParams.splitOnPay)
        .div(maxPercentage);
      const expectedDividendAmount = paymentAmount.mul(dividendSplit).div(maxPercentage);

      it('should register correct split between beneficiary and dividend pool from non-curve owner', async function() {
        tx = await bondingCurve.pay(paymentAmount, {from: nonOwner});

        expectEvent.inLogs(tx.logs, PAY_EVENT, {
          from: nonOwner,
          token: paymentToken.address,
          amount: paymentAmount,
          beneficiaryAmount: expectedBeneficiaryAmount,
          dividendAmount: expectedDividendAmount
        });
      });

      it('should register correct split between beneficiary and dividend pool from curve owner', async function() {
        tx = await bondingCurve.pay(paymentAmount, {from: curveOwner});

        expectEvent.inLogs(tx.logs, PAY_EVENT, {
          from: curveOwner,
          token: paymentToken.address,
          amount: paymentAmount,
          beneficiaryAmount: expectedBeneficiaryAmount,
          dividendAmount: expectedDividendAmount
        });
      });

      it('should transfer correct token amounts between beneficiary and dividend pool', async function() {
        const beneficiaryBeforeBalance = await paymentToken.balanceOf(curveOwner);
        const dividendBeforeBalance = await paymentToken.balanceOf(dividendPool.address);

        tx = await bondingCurve.pay(paymentAmount, {from: nonOwner});
        const event = expectEvent.inLogs(tx.logs, PAY_EVENT);

        const beneficiaryAfterBalance = await paymentToken.balanceOf(curveOwner);
        const dividendAfterBalance = await paymentToken.balanceOf(dividendPool.address);

        expect(event.args.beneficiaryAmount).to.be.bignumber.equal(
          beneficiaryAfterBalance.sub(beneficiaryBeforeBalance)
        );

        expect(event.args.dividendAmount).to.be.bignumber.equal(
          dividendAfterBalance.sub(dividendBeforeBalance)
        );
      });

      it('should return remainder of payment tokens to sender', async function() {});

      describe('splitOnPay 0%', async () => {
        beforeEach(async () => {
          const splitOnPay = new BN(0);

          const testBondingCurve = await BondingCurve.at(
            await helpers.appCreate(
              helpers.constants.BC_DAO_PACKAGE,
              helpers.constants.BONDING_CURVE,
              constants.ZERO_ADDRESS,
              '0x'
            )
          );

          await testBondingCurve.initialize(
            curveOwner,
            curveOwner,
            paymentToken.address,
            bondedToken.address,
            buyCurve.address,
            sellCurve.address,
            dividendPool.address,
            splitOnPay
          );
        });

        it('should transfer all tokens to beneficiary when splitOnPay is 0%', async function() {});
      });

      describe('splitOnPay 100%', async () => {
        beforeEach(async () => {
          const splitOnPay = new BN(100);

          const testBondingCurve = await BondingCurve.at(
            await helpers.appCreate(
              helpers.constants.BC_DAO_PACKAGE,
              helpers.constants.BONDING_CURVE,
              constants.ZERO_ADDRESS,
              '0x'
            )
          );

          await testBondingCurve.initialize(
            curveOwner,
            curveOwner,
            paymentToken.address,
            bondedToken.address,
            buyCurve.address,
            sellCurve.address,
            dividendPool.address,
            splitOnPay
          );
        });

        it('should transfer all tokens to dividend pool when splitOnPay is 100%', async function() {});
      });
    });
  });
});
