const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const expectEvent = require('../expectEvent');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const deploy = require('../../index.js');
const contractConstants = require('../constants/contractConstants.js');

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
  let sellCurve;

  //   // Deploy bondingCurve proxy w/o initialization (check service for example)
  //   // Call initialize and expect revert

  beforeEach(async function() {
    project = await deploy.deployProject();

    paymentToken = await deploy.deployBondedToken(project, [
      paymentTokenValues.parameters.name,
      paymentTokenValues.parameters.symbol,
      paymentTokenValues.parameters.decimals,
      tokenMinter,
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
      rewardsDistributor.address
    ]);

    await rewardsDistributor.methods.transferOwnership(
      bondedToken.address
    ).send({from: curveOwner});

    buyCurve = await deploy.deployStaticCurveLogic(project, [
      deployParams.buyCurveParams.toString()
    ]);

    sellCurve = await deploy.deployStaticCurveLogic(project, [
      deployParams.sellCurveParams.toString()
    ]);

    bondingCurve = await deploy.deployBondingCurve(project, [
      curveOwner,
      curveOwner,
      paymentToken.address,
      bondedToken.address,
      buyCurve.address,
      sellCurve.address,
      deployParams.splitOnPay.toString()
    ]);

    await bondedToken.methods.addMinter(bondingCurve.address).send({from: tokenMinter});
    await bondedToken.methods.renounceMinter().send({from: tokenMinter});
  });

  describe('Initialization', async () => {
    it('should have properly initialized parameters', async function() {
      expect(await bondingCurve.methods.owner().call({from: miscUser})).to.be.equal(curveOwner);
      expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
        curveOwner
      );
      expect(await bondingCurve.methods.collateralToken().call({from: miscUser})).to.be.equal(
        paymentToken.address
      );
      expect(await bondingCurve.methods.bondedToken().call({from: miscUser})).to.be.equal(
        bondedToken.address
      );
      expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
        buyCurve.address
      );
      expect(await bondingCurve.methods.sellCurve().call({from: miscUser})).to.be.equal(
        sellCurve.address
      );
      expect(
        new BN(await bondingCurve.methods.splitOnPay().call({from: miscUser}))
      ).to.be.bignumber.equal(deployParams.splitOnPay);
      expect(await bondingCurve.methods.reserveBalance().call({from: miscUser})).to.be.equal('0');
      expect(await bondingCurve.methods.getPaymentThreshold().call({from: miscUser})).to.be.equal(
        '100'
      );
    });

    it('should fail on invalid splitOnPay', async () => {
      const invalidSplitOnPay = new BN(101);

      await expectRevert.unspecified(
        deploy.deployBondingCurve(project, [
          curveOwner,
          curveOwner,
          paymentToken.address,
          bondedToken.address,
          buyCurve.address,
          sellCurve.address,
          invalidSplitOnPay.toString()
        ])
      );
    });
  });

  describe('Curve Admin', async () => {
    it('should allow owner to set new beneficiary', async function() {
      tx = await bondingCurve.methods.setBeneficiary(userAccounts[0]).send({
        from: curveOwner
      });
      expect(await bondingCurve.methods.beneficiary().call({from: miscUser})).to.be.equal(
        userAccounts[0]
      );
    });

    it('should not allow non-owner to set new beneficiary', async function() {
      await expectRevert.unspecified(
        bondingCurve.methods.setBeneficiary(constants.ZERO_ADDRESS).send({
          from: miscUser
        })
      );
    });

    it('should allow owner to set new owner', async function() {
      const oldOwner = curveOwner;
      const newOwner = userAccounts[0];

      tx = await bondingCurve.methods.transferOwnership(newOwner).send({from: oldOwner});

      expect(await bondingCurve.methods.owner().call({from: newOwner})).to.be.equal(newOwner);
    });

    it('should not allow non-owner to set new owner', async function() {
      const nonOwner = userAccounts[0];
      const newOwner = userAccounts[1];

      await expectRevert.unspecified(
        bondingCurve.methods.transferOwnership(newOwner).send({
          from: nonOwner
        })
      );
    });

    it('should not allow old owner to set new beneficiary after ownership transfer', async function() {
      const oldOwner = curveOwner;
      const oldBeneficiary = curveOwner;
      const newOwner = userAccounts[0];
      const newBeneficiary = userAccounts[1];

      tx = await bondingCurve.methods.transferOwnership(newOwner).send({
        from: oldOwner
      });

      result = await bondingCurve.methods.beneficiary().call({from: miscUser});
      expect(result).to.be.equal(oldBeneficiary);

      await bondingCurve.methods.setBeneficiary(newBeneficiary).send({
        from: newOwner
      });

      result = await bondingCurve.methods.beneficiary().call({from: miscUser});
      expect(result).to.be.equal(newBeneficiary);
    });

    it('should allow owner to set new buy curve', async function() {
      tx = await bondingCurve.methods.setBuyCurve(constants.ZERO_ADDRESS).send({
        from: curveOwner
      });
      expect(await bondingCurve.methods.buyCurve().call({from: miscUser})).to.be.equal(
        constants.ZERO_ADDRESS
      );
    });

    it('should not allow non-owner to set new buy curve', async function() {
      await expectRevert.unspecified(
        bondingCurve.methods.setBuyCurve(constants.ZERO_ADDRESS).send({
          from: miscUser
        })
      );
    });

    it('should allow owner to set new sell curve', async function() {
      tx = await bondingCurve.methods.setSellCurve(constants.ZERO_ADDRESS).send({
        from: curveOwner
      });
      expect(await bondingCurve.methods.sellCurve().call({from: miscUser})).to.be.equal(
        constants.ZERO_ADDRESS
      );
    });

    it('should not allow non-owner to set new sell curve', async function() {
      await expectRevert.unspecified(
        bondingCurve.methods.setSellCurve(constants.ZERO_ADDRESS).send({
          from: miscUser
        })
      );
    });

    it('should allow owner to set new split on pay', async function() {
      const newSplitOnPay = '20';

      tx = await bondingCurve.methods.setSplitOnPay(newSplitOnPay).send({
        from: curveOwner
      });
      expect(await bondingCurve.methods.splitOnPay().call({from: miscUser})).to.be.equal(
        newSplitOnPay
      );
    });

    it('should not allow non-owner to set new split on pay', async function() {
      await expectRevert.unspecified(
        bondingCurve.methods.setSplitOnPay(constants.ZERO_ADDRESS).send({
          from: miscUser
        })
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
    const expectedSellReward = numTokens
      .mul(deployParams.sellCurveParams)
      .div(contractConstants.bondingCurve.tokenRatioPrecision);
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

      it('should not allow to buy if sell curve value is higher than buy curve value', async function() {
        // Reverse buy and sell curves
        await bondingCurve.methods.setSellCurve(buyCurve.address).send({from: curveOwner});
        await bondingCurve.methods.setBuyCurve(sellCurve.address).send({from: curveOwner});

        await expectRevert.unspecified(
          bondingCurve.methods
            .buy(numTokens.toString(), maxBuyPrice.toString(), buyer)
            .send({from: buyer})
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

    describe('Payments', async () => {
      const nonOwner = userAccounts[0];

      const userBalances = new BN(100000);
      const paymentAmount = new BN(10000);

      beforeEach(async () => {
        await paymentToken.methods.mint(curveOwner, userBalances.toString()).send({
          from: tokenMinter
        });
        await paymentToken.methods.mint(nonOwner, userBalances.toString()).send({
          from: tokenMinter
        });
        await paymentToken.methods.approve(bondingCurve.address, paymentAmount.toString()).send({
          from: curveOwner
        });
        await paymentToken.methods.approve(bondingCurve.address, paymentAmount.toString()).send({
          from: nonOwner
        });
      });

      it('should not allow payments of amount 0', async function() {
        await expectRevert.unspecified(bondingCurve.methods.pay(0).send({from: curveOwner}));
      });

      it('should register payments', async function() {
        tx = await bondingCurve.methods.pay(paymentAmount.toString()).send({from: nonOwner});

        expectEvent.inLogs(tx.events, 'Pay', {
          from: nonOwner,
          token: paymentToken.address,
          amount: paymentAmount.toString()
        });

        tx = await bondingCurve.methods.pay(paymentAmount.toString()).send({from: curveOwner});

        expectEvent.inLogs(tx.events, 'Pay', {
          from: curveOwner,
          token: paymentToken.address,
          amount: paymentAmount.toString()
        });
      });

      it('should not allow pay with greater amount than senders balance', async function() {
        const exceededBalance = userBalances.add(userBalances);

        await expectRevert.unspecified(
          bondingCurve.methods.pay(exceededBalance.toString()).send({
            from: nonOwner
          })
        );
        await expectRevert.unspecified(
          bondingCurve.methods.pay(exceededBalance.toString()).send({
            from: curveOwner
          })
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
          tx = await bondingCurve.methods.pay(paymentAmount.toString()).send({from: nonOwner});

          expectEvent.inLogs(tx.events, 'Pay', {
            from: nonOwner,
            token: paymentToken.address,
            amount: paymentAmount.toString(),
            beneficiaryAmount: expectedBeneficiaryAmount.toString(),
            dividendAmount: expectedDividendAmount.toString()
          });
        });

        it('should register correct split between beneficiary and dividend pool from curve owner', async function() {
          tx = await bondingCurve.methods.pay(paymentAmount.toString()).send({
            from: curveOwner
          });

          expectEvent.inLogs(tx.events, 'Pay', {
            from: curveOwner,
            token: paymentToken.address,
            amount: paymentAmount.toString(),
            beneficiaryAmount: expectedBeneficiaryAmount.toString(),
            dividendAmount: expectedDividendAmount.toString()
          });
        });

        // it('should transfer correct token amounts between beneficiary and dividend pool', async function() {
        //   const beneficiaryBeforeBalance = new BN(
        //     await paymentToken.methods.balanceOf(curveOwner).call({from: miscUser})
        //   );

        //   const dividendBeforeBalance = new BN(
        //     await paymentToken.methods.balanceOf(dividendPool.address).call({from: miscUser})
        //   );

        //   tx = await bondingCurve.methods.pay(paymentAmount.toString()).send({
        //     from: nonOwner
        //   });
        //   const event = expectEvent.inLogs(tx.events, 'Pay');

        //   const beneficiaryAfterBalance = new BN(
        //     await paymentToken.methods.balanceOf(curveOwner).call({from: miscUser})
        //   );

        //   const dividendAfterBalance = new BN(
        //     await paymentToken.methods.balanceOf(dividendPool.address).call({from: miscUser})
        //   );

        //   const beneficiaryAmount = new BN(expectEvent.getParameter(event, 'beneficiaryAmount'));
        //   const dividendAmount = new BN(expectEvent.getParameter(event, 'dividendAmount'));

        //   expect(beneficiaryAmount).to.be.bignumber.equal(
        //     beneficiaryAfterBalance.sub(beneficiaryBeforeBalance)
        //   );

        //   expect(dividendAmount).to.be.bignumber.equal(
        //     dividendAfterBalance.sub(dividendBeforeBalance)
        //   );
        // });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeBondingCurve
};
