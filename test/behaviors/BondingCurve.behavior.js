const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const expectEvent = require('../expectEvent');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const deploy = require('../../index.js');
const contractConstants = require('../constants/contractConstants.js');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');
const {str, bn} = require('../helpers/utils');

async function shouldBehaveLikeBondingCurve(context, parameters) {
  const {adminAccount, curveOwner, tokenMinter, userAccounts, miscUser} = context;
  let {deployParams, bondedTokenValues, paymentTokenValues} = parameters;
  let tx;
  let result;

  let project;
  let paymentToken;
  let rewardsDistributor;
  let bondedToken;
  let bondingCurve;
  let buyCurve;

  //   // Deploy bondingCurve proxy w/o initialization (check service for example)
  //   // Call initialize and expect revert

  beforeEach(async function() {
    project = await deploy.deployProject();

    // TODO: Use an ERC20Mintable instead of a BondedToken here!
    paymentToken = await deploy.deployBondedToken(project, [
      paymentTokenValues.parameters.name,
      paymentTokenValues.parameters.symbol,
      paymentTokenValues.parameters.decimals,
      tokenMinter,
      ZERO_ADDRESS,
      str(0),
      ZERO_ADDRESS,
      ZERO_ADDRESS
    ]);

    const paymentTokenInitialBalance = new BN(web3.utils.toWei('60000', 'ether'));

    await paymentToken.methods
      .mint(tokenMinter, paymentTokenInitialBalance.toString())
      .send({from: tokenMinter});

    rewardsDistributor = await deploy.deployRewardsDistributor(project, [curveOwner]);

    bondedToken = await deploy.deployBondedToken(project, [
      bondedTokenValues.parameters.name,
      bondedTokenValues.parameters.symbol,
      bondedTokenValues.parameters.decimals,
      tokenMinter,
      ZERO_ADDRESS,
      str(0),
      rewardsDistributor.address,
      paymentToken.address
    ]);

    await rewardsDistributor.methods
      .transferOwnership(bondedToken.address)
      .send({from: curveOwner});

    buyCurve = await deploy.deployStaticCurveLogic(project, [
      deployParams.buyCurveParams.toString()
    ]);

    bondingCurve = await deploy.deployBondingCurve(project, [
      curveOwner,
      curveOwner,
      paymentToken.address,
      bondedToken.address,
      buyCurve.address,
      deployParams.reservePercentage.toString(),
      deployParams.dividendPercentage.toString()
    ]);

    await bondedToken.methods.addMinter(bondingCurve.address).send({from: tokenMinter});
    await bondedToken.methods.renounceMinter().send({from: tokenMinter});
  });

  describe('Initialization', async () => {
    it('should fail on invalid dividendPercentage', async () => {
      const invalidDividendPercentage = new BN(101);

      await expectRevert.unspecified(
        deploy.deployBondingCurve(project, [
          curveOwner,
          curveOwner,
          paymentToken.address,
          bondedToken.address,
          buyCurve.address,
          deployParams.reservePercentage.toString(),
          invalidDividendPercentage.toString()
        ])
      );
    });
  });

  describe('Buy / Sell', async () => {
    const buyer = userAccounts[0];

    const userBalances = new BN(100000000);
    const approvalAmount = new BN(100000000);

    const numTokens = new BN(100000);

    const expectedBuyPrice = numTokens
      .mul(deployParams.buyCurveParams)
      .div(contractConstants.bondingCurve.tokenRatioPrecision);
    const expectedSellReward = expectedBuyPrice
      .mul(deployParams.reservePercentage)
      .div(new BN(100));
    const maxBuyPrice = new BN(0); //We don't want a max price unless we're specifically testing that
    const minSellPrice = new BN(0); //We don't want a min price unless we're specifically testing that

    it('should show buy price correctly', async function() {
      result = await bondingCurve.methods.priceToBuy(numTokens.toString()).call({from: miscUser});

      expect(new BN(result)).to.be.bignumber.equal(expectedBuyPrice);
    });

    it('should show sell reward correctly', async function() {
      result = await bondingCurve.methods
        .rewardForSell(numTokens.toString())
        .call({from: miscUser});

      expect(new BN(result)).to.be.bignumber.equal(expectedSellReward);
    });

    it('should not allow bondingCurve owner to mint bondedTokens', async function() {
      await expectRevert.unspecified(
        bondedToken.methods.mint(curveOwner, 100).send({from: curveOwner})
      );
    });

    it('should not allow other addresses to mint bondedTokens', async function() {
      await expectRevert.unspecified(
        bondedToken.methods.mint(userAccounts[3], 100).send({from: userAccounts[3]})
      );
    });

    describe('Buy Failure Cases', async () => {
      it('should not allow to buy with 0 tokens specified', async function() {
        await expectRevert.unspecified(
          bondingCurve.methods.buy(0, maxBuyPrice.toString(), buyer).send({from: buyer})
        );
      });

      it('should not allow user without collateralTokens approved to buy bondedTokens', async function() {
        await expectRevert.unspecified(
          bondingCurve.methods
            .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
            .send({from: buyer})
        );
      });

      it('should not allow buy if current price exceeds specified max price', async function() {
        await expectRevert.unspecified(
          bondingCurve.methods.buy(numTokens.toString(), '1', buyer).send({
            from: buyer
          })
        );
      });
    });

    describe('Buy', async () => {
      beforeEach(async () => {
        await paymentToken.methods.mint(curveOwner, userBalances.toString()).send({
          from: tokenMinter
        });
        await paymentToken.methods.mint(buyer, userBalances.toString()).send({from: tokenMinter});
        await paymentToken.methods.approve(bondingCurve.address, approvalAmount.toString()).send({
          from: curveOwner
        });
        await paymentToken.methods.approve(bondingCurve.address, approvalAmount.toString()).send({
          from: buyer
        });
      });

      it('should not allow owner to buy when paused', async function() {
        await bondingCurve.methods.pause().send({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.methods.buy(numTokens.toString(), maxBuyPrice.toString(), buyer).send({
            from: curveOwner
          })
        );
      });

      it('should not allow user to buy when paused', async function() {
        await bondingCurve.methods.pause().send({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.methods.buy(numTokens.toString(), maxBuyPrice.toString(), buyer).send({
            from: buyer
          })
        );
      });

      it('should mint bondedTokens correctly on buy', async function() {
        const beforeBalance = new BN(
          await bondedToken.methods.balanceOf(buyer).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const afterBalance = new BN(
          await bondedToken.methods.balanceOf(buyer).call({from: miscUser})
        );

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(numTokens));
      });

      it('should transfer collateral tokens from buyer correctly on buy', async function() {
        const beforeBalance = new BN(
          await paymentToken.methods.balanceOf(buyer).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const afterBalance = new BN(
          await paymentToken.methods.balanceOf(buyer).call({from: miscUser})
        );

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedBuyPrice));
      });

      it('should transfer collateral tokens to reserve correctly on buy', async function() {
        const beforeBalance = new BN(
          await paymentToken.methods.balanceOf(bondingCurve.address).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const event = expectEvent.inLogs(tx.events, 'Buy');

        const afterBalance = new BN(
          await paymentToken.methods.balanceOf(bondingCurve.address).call({from: miscUser})
        );

        const reserveAmount = new BN(expectEvent.getParameter(event, 'reserveAmount'));

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
      });

      it('should record reserve balance correctly on buy', async function() {
        const beforeBalance = new BN(
          await paymentToken.methods.balanceOf(bondingCurve.address).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const event = expectEvent.inLogs(tx.events, 'Buy');

        const reserveBalance = new BN(
          await bondingCurve.methods.reserveBalance().call({from: miscUser})
        );

        const reserveAmount = new BN(expectEvent.getParameter(event, 'reserveAmount'));

        expect(reserveBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
      });

      it('should transfer collateral tokens to beneficiary correctly on buy', async function() {
        const beforeBalance = new BN(
          await paymentToken.methods.balanceOf(deployParams.beneficiary).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const event = expectEvent.inLogs(tx.events, 'Buy');

        const afterBalance = new BN(
          await paymentToken.methods.balanceOf(deployParams.beneficiary).call({from: miscUser})
        );

        const beneficiaryAmount = new BN(expectEvent.getParameter(event, 'beneficiaryAmount'));

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(beneficiaryAmount));
      });

      it('should register buy event on buy', async function() {
        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
          .send({
            from: buyer
          });
        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer: buyer,
          recipient: buyer,
          amount: numTokens.toString()
        });
      });

      it('should allow buy if current price is below max price specified', async function() {
        tx = await bondingCurve.methods
          .buy(numTokens.toString(), '1000000000000000000000000', buyer)
          .send({
            from: buyer
          });
        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer: buyer,
          recipient: buyer,
          amount: numTokens.toString()
        });
      });

      it('should allow user to buy for a different recipient', async function() {
        tx = await bondingCurve.methods
          .buy(numTokens.toString(), maxBuyPrice.toString(), userAccounts[1])
          .send({
            from: buyer
          });
        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer: buyer,
          recipient: userAccounts[1],
          amount: numTokens.toString()
        });
      });
    });

    describe('Sell Failure Cases', async () => {
      it('should not allow to sell with 0 tokens specified', async function() {
        await expectRevert.unspecified(
          bondingCurve.methods.sell(0, maxBuyPrice.toString(), buyer).send({from: buyer})
        );
      });

      it('should not allow user without bondedTokens to sell', async function() {
        //TODO: Test, REMOVE
        await expectRevert.unspecified(
          bondingCurve.methods
            .sell(numTokens.toString(), minSellPrice.toString(), curveOwner)
            .send({
              from: curveOwner
            })
        );

        await expectRevert.unspecified(
          bondingCurve.methods.sell(numTokens.toString(), minSellPrice.toString(), buyer).send({
            from: buyer
          })
        );
      });
    });

    describe('Sell', async () => {
      beforeEach(async () => {
        await paymentToken.methods.mint(curveOwner, userBalances.toString()).send({
          from: tokenMinter
        });
        await paymentToken.methods.mint(buyer, userBalances.toString()).send({
          from: tokenMinter
        });
        await paymentToken.methods.approve(bondingCurve.address, approvalAmount.toString()).send({
          from: curveOwner
        });
        await paymentToken.methods.approve(bondingCurve.address, approvalAmount.toString()).send({
          from: buyer
        });
        await bondingCurve.methods.buy(numTokens.toString(), maxBuyPrice.toString(), buyer).send({
          from: buyer
        });
      });

      it('should not allow owner to sell when paused', async function() {
        await bondingCurve.methods.pause().send({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.methods.sell(numTokens.toString(), minSellPrice.toString(), buyer).send({
            from: curveOwner
          })
        );
      });

      it('should not allow user to sell when paused', async function() {
        await bondingCurve.methods.pause().send({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.methods.sell(numTokens.toString(), minSellPrice.toString(), buyer).send({
            from: buyer
          })
        );
      });

      it('should allow user with bondedTokens to sell all bondedTokens', async function() {
        tx = await bondingCurve.methods
          .sell(numTokens.toString(), minSellPrice.toString(), buyer)
          .send({
            from: buyer
          });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient: buyer,
          amount: numTokens.toString()
        });
      });

      it('should allow user with bondedTokens to sell some bondedTokens', async function() {
        const tokensToSell = numTokens.div(new BN(2));

        tx = await bondingCurve.methods
          .sell(tokensToSell.toString(), minSellPrice.toString(), buyer)
          .send({
            from: buyer
          });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient: buyer,
          amount: tokensToSell
        });
      });

      it('should burn tokens from seller on sell', async function() {
        const beforeBalance = new BN(
          await bondedToken.methods.balanceOf(buyer).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .sell(numTokens.toString(), minSellPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const afterBalance = new BN(
          await bondedToken.methods.balanceOf(buyer).call({from: miscUser})
        );
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(numTokens));
      });

      it('should transfer collateral tokens from reserve on sell', async function() {
        const beforeBalance = new BN(
          await paymentToken.methods.balanceOf(bondingCurve.address).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .sell(numTokens.toString(), minSellPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const afterBalance = new BN(
          await paymentToken.methods.balanceOf(bondingCurve.address).call({from: miscUser})
        );
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedSellReward));
      });

      it('should transfer collateral tokens to seller on sell', async function() {
        const beforeBalance = new BN(
          await paymentToken.methods.balanceOf(buyer).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .sell(numTokens.toString(), minSellPrice.toString(), buyer)
          .send({
            from: buyer
          });

        const afterBalance = new BN(
          await paymentToken.methods.balanceOf(buyer).call({from: miscUser})
        );
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(expectedSellReward));
      });

      it('should allow user to sell and send reward to different recipient', async function() {
        const recipient = userAccounts[2];

        const recipientBeforeBalance = new BN(
          await paymentToken.methods.balanceOf(recipient).call({from: miscUser})
        );

        tx = await bondingCurve.methods
          .sell(numTokens.toString(), minSellPrice.toString(), recipient)
          .send({
            from: buyer
          });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient: recipient,
          amount: numTokens.toString()
        });

        const recipientAfterBalance = new BN(
          await paymentToken.methods.balanceOf(recipient).call({from: miscUser})
        );

        expect(recipientAfterBalance).to.be.bignumber.above(recipientBeforeBalance);
      });

      it('should not allow sell if current reward is lower than specified min reward', async function() {
        const result = await bondingCurve.methods
          .rewardForSell(numTokens.toString())
          .call({from: miscUser});

        const rewardForSell = new BN(result);
        const mulFactor = new BN(2);

        await expectRevert.unspecified(
          bondingCurve.methods
            .sell(numTokens.toString(), rewardForSell.mul(mulFactor).toString(), buyer)
            .send({
              from: buyer
            })
        );
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeBondingCurve
};
