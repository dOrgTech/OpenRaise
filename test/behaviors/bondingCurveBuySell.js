const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const BondedToken = artifacts.require("BondedToken.sol");

const expectEvent = require('../expectEvent');

const {CurveEcosystem} = require("../helpers/CurveEcosystem");
const {str, bn} = require("../helpers/utils");

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');
const contractConstants = require('../constants/contractConstants');

const bondingCurveBuySellTests = async (suiteName, config) => {
    contract('Bonding Curve Admin', async accounts => {
        console.log(1)
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
        }

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
            console.log(2)
            it('should show buy price correctly', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                let result = await bondingCurve.priceToBuy(numTokens, {from: buyer});

                expect(new BN(result)).to.be.bignumber.equal(expectedBuyPrice);
            });

            it('should show sell reward correctly', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                let result = await bondingCurve
                    .rewardForSell(numTokens, {from: buyer});

                expect(new BN(result)).to.be.bignumber.equal(expectedSellReward);
            });

            it('should not allow bondingCurve owner to mint bondedTokens', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(
                    bondedToken.mint(curveOwner, 100, {from: curveOwner})
                );
            });

            it('should not allow other addresses to mint bondedTokens', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(
                    bondedToken.mint(userAccounts[3], 100, {from: userAccounts[3]})
                );
            });
        });

        describe('Buy Failure Cases', async () => {
            it('should not allow to buy with 0 tokens specified', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(
                    bondingCurve.buy(0, maxBuyPrice, buyer, {from: buyer})
                );
            });

            it('should not allow user without collateralTokens approved to buy bondedTokens', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(
                    bondingCurve
                        .buy(numTokens, maxBuyPrice, buyer, {from: buyer})
                );
            });

            it('should not allow buy if current price exceeds specified max price', async function () {
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
            it('should not allow owner to buy when paused', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                await bondingCurve.pause({from: curveOwner});
                await expectRevert.unspecified(
                    bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
                        from: curveOwner
                    })
                );
            });

            it('should not allow user to buy when paused', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                await bondingCurve.pause({from: curveOwner});
                await expectRevert.unspecified(
                    bondingCurve.buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    })
                );
            });

            it('should mint bondedTokens correctly on buy', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                const beforeBalance = new BN(
                    await bondedToken.balanceOf(buyer, {from: buyer})
                );

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    });

                const afterBalance = new BN(
                    await bondedToken.balanceOf(buyer, {from: buyer})
                );

                expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(numTokens));
            });

            it('should transfer collateral tokens from buyer correctly on buy', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                const beforeBalance = new BN(
                    await paymentToken.balanceOf(buyer, {from: buyer})
                );

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    });

                const afterBalance = new BN(
                    await paymentToken.balanceOf(buyer, {from: buyer})
                );

                expect(afterBalance).to.be.bignumber.equal(beforeBalance.sub(expectedBuyPrice));
            });

            it('should transfer collateral tokens to reserve correctly on buy', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                const beforeBalance = new BN(
                    await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
                );

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    });

                const event = expectEvent.inLogs(tx.events, 'Buy');

                const afterBalance = new BN(
                    await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
                );

                const reserveAmount = new BN(expectEvent.getParameter(event, 'reserveAmount'));

                expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
            });

            it('should record reserve balance correctly on buy', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                const beforeBalance = new BN(
                    await paymentToken.balanceOf(bondingCurve.address, {from: buyer})
                );

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    });

                const event = expectEvent.inLogs(tx.events, 'Buy');

                const reserveBalance = new BN(
                    await bondingCurve.reserveBalance({from: buyer})
                );

                const reserveAmount = new BN(expectEvent.getParameter(event, 'reserveAmount'));

                expect(reserveBalance).to.be.bignumber.equal(beforeBalance.add(reserveAmount));
            });

            it('should transfer collateral tokens to beneficiary correctly on buy', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                const beforeBalance = new BN(
                    await paymentToken.balanceOf(deployParams.beneficiary, {from: buyer})
                );

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    });

                const event = expectEvent.inLogs(tx.events, 'Buy');

                const afterBalance = new BN(
                    await paymentToken.balanceOf(deployParams.beneficiary, {from: buyer})
                );

                const beneficiaryAmount = new BN(expectEvent.getParameter(event, 'beneficiaryAmount'));

                expect(afterBalance).to.be.bignumber.equal(beforeBalance.add(beneficiaryAmount));
            });

            it('should register buy event on buy', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, buyer, {
                        from: buyer
                    });
                //Verify events
                expectEvent.inLogs(tx.events, 'Buy', {
                    buyer: buyer,
                    recipient: buyer,
                    amount: numTokens
                });
            });

            it('should allow buy if current price is below max price specified', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                tx = await bondingCurve
                    .buy(numTokens, '1000000000000000000000000', buyer, {
                        from: buyer
                    });
                //Verify events
                expectEvent.inLogs(tx.events, 'Buy', {
                    buyer: buyer,
                    recipient: buyer,
                    amount: numTokens
                });
            });

            it('should allow user to buy for a different recipient', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, tokenMinter, [curveOwner, buyer], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, buyer], approvalAmount);

                tx = await bondingCurve
                    .buy(numTokens, maxBuyPrice, userAccounts[1], {
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
    })
}

module.exports = {
    bondingCurveBuySellTests
}

