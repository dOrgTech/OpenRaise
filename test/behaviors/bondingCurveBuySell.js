const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const BondedToken = artifacts.require('BondedToken.sol');

const expectEvent = require('../expectEvent');

const {CurveEcosystem} = require('../helpers/CurveEcosystem');
const {str, bn} = require('../helpers/utils');

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');
const contractConstants = require('../constants/contractConstants');

const bondingCurveBuySellTests = async (suiteName, config) => {
  contract('Bonding Curve Admin', async accounts => {
    const adminAccount = accounts[0];
    const curveOwner = accounts[1];
    const tokenMinter = accounts[2];
    const userAccounts = accounts.slice(3, accounts.length);
    const buyer = userAccounts[0];

    const accountsConfig = {
      adminAccount,
      curveOwner,
      minter: tokenMinter,
      userAccounts,
      buyer
    };

    const userBalances = bn(100000000);
    const approvalAmount = bn(100000000);

    const numTokens = bn(100000);
    const expectedBuyPrice = numTokens
      .mul(config.deployParams.curveLogicParams.tokenRatio)
      .div(contractConstants.bondingCurve.tokenRatioPrecision);
    const expectedSellReward = expectedBuyPrice
      .mul(config.deployParams.curveParams.reservePercentage)
      .div(bn(100));
    const maxBuyPrice = bn(0); //We don't want a max price unless we're specifically testing that
    const minSellPrice = bn(0); //We don't want a min price unless we're specifically testing that
    describe('Helper', async () => {
      it('should show buy price correctly', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        let result = await bondingCurve.priceToBuy(numTokens, {from: buyer});

        expect(new BN(result)).to.be.bignumber.equal(expectedBuyPrice);
      });

      it('should show sell reward correctly', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        let result = await bondingCurve.rewardForSell(numTokens, {from: buyer});

        expect(new BN(result)).to.be.bignumber.equal(expectedSellReward);
      });

      it('should not allow bondingCurve owner to mint bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(bondedToken.mint(curveOwner, 100, {from: curveOwner}));
      });

      it('should not allow other addresses to mint bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondedToken.mint(userAccounts[3], 100, {from: userAccounts[3]})
        );
      });
    });

    describe('Buy Failure Cases', async () => {
      it('should not allow to buy with 0 tokens specified', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(bondingCurve.buy(0, maxBuyPrice, buyer, {from: buyer}));
      });

      it('should not allow user without collateralTokens approved to buy bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer})
        );
      });

      it('should not allow buy if current price exceeds specified max price', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, '1', buyer, {
            from: buyer
          })
        );
      });
    });

    describe('Buy', async () => {
      it('should not allow owner to buy when paused', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        await bondingCurve.pause({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
            from: curveOwner
          })
        );
      });

      it('should not allow user to buy when paused', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        await bondingCurve.pause({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
            from: buyer
          })
        );
      });

      it('should mint bondedTokens correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        const beforeBalance = new BN(await bondedToken.balanceOf(buyer, {from: buyer}));

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const afterBalance = new BN(await bondedToken.balanceOf(buyer, {from: buyer}));

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(numTokens));
      });

      it('should transfer collateral tokens from buyer correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        const beforeBalance = new BN(await paymentToken.balanceOf(buyer, {from: buyer}));

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const afterBalance = new BN(await paymentToken.balanceOf(buyer, {from: buyer}));

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedBuyPrice));
      });

      it('should transfer collateral tokens to reserve correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        const beforeBalance = new BN(
          await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
        );

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const afterBalance = new BN(
          await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
        );

        const reserveAmount = tx.logs[0].args.reserveAmount;

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
      });

      it('should record reserve balance correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        const beforeBalance = new BN(
          await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
        );

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const reserveBalance = new BN(await bondingCurve.reserveBalance({from: buyer}));

        const reserveAmount = tx.logs[0].args.reserveAmount;

        expect(reserveBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
      });

      it('should transfer collateral tokens to beneficiary correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        const beneficiary = await bondingCurve.beneficiary();
        const beforeBalance = new BN(await paymentToken.balanceOf(beneficiary, {from: buyer}));

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const event = expectEvent.inLogs(tx.events, 'Buy');

        const afterBalance = new BN(await paymentToken.balanceOf(beneficiary, {from: buyer}));

        const beneficiaryAmount = tx.logs[0].args.beneficiaryAmount;

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(beneficiaryAmount));
      });

      it('should register buy event on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });
        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer: buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow buy if current price is below max price specified', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        let tx = await bondingCurve.buy(numTokens, '1000000000000000000000000', buyer, {
          from: buyer
        });
        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer: buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow user to buy for a different recipient', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );

        let tx = await bondingCurve.buy(numTokens, maxBuyPrice, userAccounts[1], {
          from: buyer
        });
        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer: buyer,
          recipient: userAccounts[1],
          amount: numTokens
        });
      });
    });

    describe('Sell Failure Cases', async () => {
      it('should not allow to sell with 0 tokens specified', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(bondingCurve.sell(0, maxBuyPrice, buyer, {from: buyer}));
      });

      it('should not allow user without bondedTokens to sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondingCurve.sell(numTokens, minSellPrice, curveOwner, {
            from: curveOwner
          })
        );

        await expectRevert.unspecified(
          bondingCurve.sell(numTokens, minSellPrice, buyer, {
            from: buyer
          })
        );
      });
    });

    describe('Sell', async () => {
      it('should not allow owner to sell when paused', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        await bondingCurve.pause({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.sell(numTokens, minSellPrice, buyer, {
            from: curveOwner
          })
        );
      });

      it('should not allow user to sell when paused', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        await bondingCurve.pause({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.sell(numTokens, minSellPrice, buyer, {
            from: buyer
          })
        );
      });

      it('should allow user with bondedTokens to sell all bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        let tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow user with bondedTokens to sell some bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const tokensToSell = numTokens.div(new BN(2));

        let tx = await bondingCurve.sell(tokensToSell, minSellPrice, buyer, {
          from: buyer
        });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient: buyer,
          amount: tokensToSell
        });
      });

      it('should burn tokens from seller on sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const beforeBalance = new BN(await bondedToken.balanceOf(buyer, {from: buyer}));

        let tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        const afterBalance = new BN(await bondedToken.balanceOf(buyer, {from: buyer}));
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(numTokens));
      });

      it('should transfer collateral tokens from reserve on sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const beforeBalance = new BN(
          await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
        );

        let tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        const afterBalance = new BN(
          await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
        );
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedSellReward));
      });

      it('should transfer collateral tokens to seller on sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const beforeBalance = new BN(await paymentToken.balanceOf(buyer, {from: buyer}));

        let tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        const afterBalance = new BN(await paymentToken.balanceOf(buyer, {from: buyer}));
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(expectedSellReward));
      });

      it('should allow user to sell and send reward to different recipient', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const recipient = userAccounts[2];

        const recipientBeforeBalance = new BN(
          await paymentToken.balanceOf(recipient, {from: buyer})
        );

        let tx = await bondingCurve.sell(numTokens, minSellPrice, recipient, {
          from: buyer
        });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient: recipient,
          amount: numTokens
        });

        const recipientAfterBalance = new BN(
          await paymentToken.balanceOf(recipient, {from: buyer})
        );

        expect(recipientAfterBalance).to.be.bignumber.above(recipientBeforeBalance);
      });

      it('should not allow sell if current reward is lower than specified min reward', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
        await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
        await eco.bulkApprove(
          paymentToken,
          bondingCurve.address,
          [curveOwner, buyer],
          approvalAmount
        );
        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer
        });

        const result = await bondingCurve.rewardForSell(numTokens, {from: buyer});

        const rewardForSell = new BN(result);
        const mulFactor = new BN(2);

        await expectRevert.unspecified(
          bondingCurve.sell(numTokens, rewardForSell.mul(mulFactor), buyer, {
            from: buyer
          })
        );
      });
    });
  });
};

module.exports = {
  bondingCurveBuySellTests
};
