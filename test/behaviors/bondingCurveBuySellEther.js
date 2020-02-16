const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const BondedToken = artifacts.require('BondedToken.sol');

const expectEvent = require('../expectEvent');

const {CurveEcosystem} = require('../helpers/CurveEcosystem');
const {str, bn, wad, MAX_UINT, WAD} = require('../helpers/utils');

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');
const contractConstants = require('../constants/contractConstants');

const bondingCurveBuySellEtherTests = async (suiteName, config) => {
  contract('Bonding Curve Buy / Sell - Ether Collateral', async accounts => {
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
    const maxBuyPrice = WAD; //We don't want a max price unless we're specifically testing that
    const minSellPrice = bn(0); //We don't want a min price unless we're specifically testing that
    describe('Helper', async () => {
      it('should show buy price correctly', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, bondedToken} = await eco.init(web3);

        let result = await bondingCurve.priceToBuy(numTokens, {from: buyer});
        expect(bn(result)).to.be.bignumber.equal(expectedBuyPrice);
      });

      it('should show sell reward correctly', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        let result = await bondingCurve.rewardForSell(numTokens, {from: buyer});
        expect(bn(result)).to.be.bignumber.equal(expectedSellReward);
      });

      it('should not allow bondingCurve owner to mint bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondedToken} = await eco.init(web3);

        await expectRevert.unspecified(bondedToken.mint(curveOwner, 100, {from: curveOwner}));
      });

      it('should not allow other addresses to mint bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondedToken} = await eco.init(web3);

        await expectRevert.unspecified(
          bondedToken.mint(userAccounts[3], 100, {from: userAccounts[3]})
        );
      });
    });

    describe('Buy Failure Cases', async () => {
      it('should not allow to buy with 0 tokens specified', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondingCurve.buy(0, maxBuyPrice, buyer, {from: buyer, value: 0})
        );
      });

      it('should not allow user without ether sent to buy bondedTokens', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {from: buyer, value: 0})
        );
      });

      it('should not allow buy if current price exceeds specified max price', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, '1', buyer, {from: buyer, value: WAD})
        );
      });

      it('should not allow buy if incorrect ether sent given specified max price', async () => {});
    });

    describe('Buy', async () => {
      it('should not allow owner to buy when paused', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.pause({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
            from: curveOwner,
            value: maxBuyPrice
          })
        );
      });

      it('should not allow user to buy when paused', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.pause({from: curveOwner});
        await expectRevert.unspecified(
          bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
            from: buyer,
            value: maxBuyPrice
          })
        );
      });

      it('should mint bondedTokens correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const before = {
          buyerBalance: await eco.getBondedTokenBalance(buyer),
          totalSupply: await eco.getBondedTokenTotalSupply()
        };

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const after = {
          buyerBalance: await eco.getBondedTokenBalance(buyer),
          totalSupply: await eco.getBondedTokenTotalSupply()
        };

        expect(after.buyerBalance).to.be.bignumber.equal(before.buyerBalance.add(numTokens));
        expect(after.totalSupply).to.be.bignumber.equal(before.totalSupply.add(numTokens));
      });

      it('should transfer ether to reserve correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const before = {
          curveEther: await eco.getEtherBalance(bondingCurve.address)
        };

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const after = {
          curveEther: await eco.getEtherBalance(bondingCurve.address)
        };
        const {reserveAmount} = tx.logs[0].args;

        expect(after.curveEther).to.be.bignumber.equal(before.curveEther.add(reserveAmount));
      });

      it('should transfer proper ether amount from buyer on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const before = {
          buyerEther: await eco.getEtherBalance(buyer)
        };

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const after = {
          buyerEther: await eco.getEtherBalance(buyer)
        };

        expect(before.buyerEther).to.be.bignumber.equal(after.buyerEther.sub(expectedBuyPrice));
      });

      it('should refund extra ETH sent on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const beforeBalance = await eco.getEtherBalance(buyer);

        const priceToBuy = bn(await bondingCurve.priceToBuy(numTokens));

        const maxValue = str(bn(maxBuyPrice).mul(bn(2)));

        const tx = await bondingCurve.buy(numTokens, maxValue, buyer, {
          from: buyer,
          value: maxValue
        });

        const afterBalance = await eco.getEtherBalance(buyer);

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(priceToBuy));
      });

      it('should record reserve balance correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const beforeBalance = bn(await bondingCurve.reserveBalance({from: buyer}));

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const reserveBalance = bn(await bondingCurve.reserveBalance({from: buyer}));

        const {reserveAmount} = tx.logs[0].args;

        expect(reserveBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
      });

      it('should transfer collateral ether to beneficiary correctly on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve, paymentToken} = await eco.init(web3);

        const beneficiary = await bondingCurve.beneficiary();
        const beforeBalance = await eco.getEtherBalance(beneficiary);

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const afterBalance = await eco.getEtherBalance(beneficiary);

        const {beneficiaryAmount} = tx.logs[0].args;

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(beneficiaryAmount));
      });

      it('should register buy event on buy', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow buy if current price is below max price specified', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const tx = await bondingCurve.buy(numTokens, '1000000000000000000000', buyer, {
          from: buyer,
          value: '1000000000000000000000'
        });

        //Verify events
        expectEvent.inLogs(tx.events, 'Buy', {
          buyer,
          recipient: buyer,
          amount: numTokens
        });
      });

      it('should allow user to buy for a different recipient', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        const tx = await bondingCurve.buy(numTokens, maxBuyPrice, userAccounts[1], {
          from: buyer,
          value: maxBuyPrice
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
        const {bondingCurve} = await eco.init(web3);

        await expectRevert.unspecified(bondingCurve.sell(0, maxBuyPrice, buyer, {from: buyer}));
      });

      it('should not allow user without bondedTokens to sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

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
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
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
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
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
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
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
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const tokensToSell = numTokens.div(bn(2));

        const tx = await bondingCurve.sell(tokensToSell, minSellPrice, buyer, {
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
        const {bondingCurve, bondedToken} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const beforeBalance = bn(await bondedToken.balanceOf(buyer, {from: buyer}));

        const tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        const afterBalance = bn(await bondedToken.balanceOf(buyer, {from: buyer}));
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(numTokens));
      });

      it('should transfer collateral ether from reserve on sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const beforeBalance = await eco.getEtherBalance(buyer);

        const tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        const afterBalance = await eco.getEtherBalance(buyer);
        expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedSellReward));
      });

      it('should transfer collateral ether to seller on sell', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const beforeBalance = await eco.getEtherBalance(buyer);

        const tx = await bondingCurve.sell(numTokens, minSellPrice, buyer, {
          from: buyer
        });

        const afterBalance = await eco.getEtherBalance(buyer);

        expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(expectedSellReward));
      });

      it('should allow user to sell and send reward to different recipient', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });
        const recipient = userAccounts[2];

        const recipientBeforeBalance = await eco.getEtherBalance(recipient);

        const tx = await bondingCurve.sell(numTokens, minSellPrice, recipient, {
          from: buyer
        });

        expectEvent.inLogs(tx.events, 'Sell', {
          seller: buyer,
          recipient,
          amount: numTokens
        });

        const recipientAfterBalance = await eco.getEtherBalance(recipient);

        expect(recipientAfterBalance).to.be.bignumber.above(recipientBeforeBalance);
      });

      it('should not allow sell if current reward is lower than specified min reward', async () => {
        const eco = new CurveEcosystem(accountsConfig, config);
        const {bondingCurve} = await eco.init(web3);

        await bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
          from: buyer,
          value: maxBuyPrice
        });

        const result = await bondingCurve.rewardForSell(numTokens, {from: buyer});

        const rewardForSell = bn(result);
        const mulFactor = bn(2);

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
  bondingCurveBuySellEtherTests
};
