const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const BondedToken = artifacts.require("BondedToken.sol");

const expectEvent = require('../expectEvent');

const {CurveEcosystem} = require("../helpers/CurveEcosystem");
const {str, bn} = require("../helpers/utils");

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');

const bondingCurvePaymentTests = async (suiteName, config) => {
    contract('Bonding Curve Admin', async accounts => {
        const adminAccount = accounts[0];
        const curveOwner = accounts[1];
        const tokenMinter = accounts[2];
        const userAccounts = accounts.slice(3, accounts.length);
        const miscUser = userAccounts[0];

        const accountsConfig = {
            adminAccount,
            curveOwner,
            minter: tokenMinter,
            userAccounts,
            miscUser
        }

        describe('Payments', async () => {
            const miscUser = userAccounts[0];

            const userBalances = bn(100000);
            const paymentAmount = bn(10000);

            it('should not allow payments of amount 0', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(bondingCurve.pay(0, {from: curveOwner}));
            });

            it('should register payments', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, accountsConfig.minter, [curveOwner, miscUser], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, miscUser], paymentAmount);

                let tx = await bondingCurve.pay(paymentAmount, {from: miscUser});

                expectEvent.inLogs(tx.events, 'Pay', {
                    from: miscUser,
                    token: paymentToken.address,
                    amount: paymentAmount
                });

                tx = await bondingCurve.pay(paymentAmount, {from: curveOwner});

                expectEvent.inLogs(tx.events, 'Pay', {
                    from: curveOwner,
                    token: paymentToken.address,
                    amount: paymentAmount
                });
            });

            it('should not allow pay with greater amount than senders balance', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                await eco.bulkMint(paymentToken, accountsConfig.minter, [curveOwner, miscUser], userBalances);
                await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, miscUser], paymentAmount);

                const exceededBalance = userBalances.add(userBalances);

                await expectRevert.unspecified(
                    bondingCurve.pay(exceededBalance, {
                        from: miscUser
                    })
                );
                await expectRevert.unspecified(
                    bondingCurve.pay(exceededBalance, {
                        from: curveOwner
                    })
                );
            });

            describe('Beneficiary / Dividend Split', async () => {
                const maxPercentage = new BN(100);
                const dividendSplit = maxPercentage.sub(config.deployParams.curveParams.dividendPercentage);
                const expectedBeneficiaryAmount = paymentAmount
                    .mul(config.deployParams.curveParams.dividendPercentage)
                    .div(maxPercentage);
                const expectedDividendAmount = paymentAmount.mul(dividendSplit).div(maxPercentage);

                it('should register correct split between beneficiary and dividend pool from non-curve owner', async function () {
                    const eco = new CurveEcosystem(accountsConfig, config);
                    const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                    await eco.bulkMint(paymentToken, accountsConfig.minter, [curveOwner, miscUser], userBalances);
                    await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, miscUser], paymentAmount);

                    let tx = await bondingCurve.pay(paymentAmount, {from: miscUser});

                    expectEvent.inLogs(tx.events, 'Pay', {
                        from: miscUser,
                        token: paymentToken.address,
                        amount: paymentAmount,
                        beneficiaryAmount: expectedBeneficiaryAmount,
                        dividendAmount: expectedDividendAmount
                    });
                });

                it('should register correct split between beneficiary and dividend pool from curve owner', async function () {
                    const eco = new CurveEcosystem(accountsConfig, config);
                    const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);
                    await eco.bulkMint(paymentToken, accountsConfig.minter, [curveOwner, miscUser], userBalances);
                    await eco.bulkApprove(paymentToken, bondingCurve.address, [curveOwner, miscUser], paymentAmount);

                    let tx = await bondingCurve.pay(paymentAmount, {
                        from: curveOwner
                    });

                    expectEvent.inLogs(tx.events, 'Pay', {
                        from: curveOwner,
                        token: paymentToken.address,
                        amount: paymentAmount,
                        beneficiaryAmount: expectedBeneficiaryAmount,
                        dividendAmount: expectedDividendAmount
                    });
                });

                // it('should transfer correct token amounts between beneficiary and dividend pool', async function() {
                //   const beneficiaryBeforeBalance = new BN(
                //     await paymentToken.balanceOf(curveOwner).call({from: miscUser})
                //   );

                //   const dividendBeforeBalance = new BN(
                //     await paymentToken.balanceOf(dividendPool.address).call({from: miscUser})
                //   );

                //   let tx = await bondingCurve.pay(paymentAmount, {
                //     from: miscUser
                //   });
                //   const event = expectEvent.inLogs(tx.events, 'Pay');

                //   const beneficiaryAfterBalance = new BN(
                //     await paymentToken.balanceOf(curveOwner).call({from: miscUser})
                //   );

                //   const dividendAfterBalance = new BN(
                //     await paymentToken.balanceOf(dividendPool.address).call({from: miscUser})
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
    })
}

module.exports = {
    bondingCurvePaymentTests
}

