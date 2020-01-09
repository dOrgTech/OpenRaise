const {BN, constants, shouldFail, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const BondedToken = artifacts.require("BondedToken.sol");

const expectEvent = require('../expectEvent');

const {CurveEcosystem} = require("../helpers/CurveEcosystem");
const {str, bn} = require("../helpers/utils");

// Import preferred chai flavor: both expect and should are supported
const {expect} = require('chai');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');

const bondingCurveAdminTests = async (suiteName, config) => {
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

        describe('Curve Admin', async () => {
            it('should allow owner to set new beneficiary', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve} = await eco.init(web3);

                let tx = await bondingCurve.setBeneficiary(userAccounts[0], {
                    from: curveOwner
                });
                expect(await bondingCurve.beneficiary({from: miscUser})).to.be.equal(
                    userAccounts[0]
                );
            });

            it('should not allow non-owner to set new beneficiary', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(
                    bondingCurve.setBeneficiary(constants.ZERO_ADDRESS, {
                        from: miscUser
                    })
                );
            });

            it('should allow owner to set new owner', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const oldOwner = curveOwner;
                const newOwner = userAccounts[0];

                let tx = await bondingCurve.transferOwnership(newOwner, {from: oldOwner});

                expect(await bondingCurve.owner({from: newOwner})).to.be.equal(newOwner);
            });

            it('should not allow non-owner to set new owner', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const nonOwner = userAccounts[0];
                const newOwner = userAccounts[1];

                await expectRevert.unspecified(
                    bondingCurve.transferOwnership(newOwner, {
                        from: nonOwner
                    })
                );
            });

            it('should not allow old owner to set new beneficiary after ownership transfer', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const oldOwner = curveOwner;
                const oldBeneficiary = curveOwner;
                const newOwner = userAccounts[0];
                const newBeneficiary = userAccounts[1];

                let tx = await bondingCurve.transferOwnership(newOwner, {
                    from: oldOwner
                });

                let result = await bondingCurve.beneficiary({from: miscUser});
                expect(result).to.be.equal(oldBeneficiary);

                await bondingCurve.setBeneficiary(newBeneficiary, {
                    from: newOwner
                });

                result = await bondingCurve.beneficiary({from: miscUser});
                expect(result).to.be.equal(newBeneficiary);
            });

            it('should allow owner to set new buy curve', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                let tx = await bondingCurve.setBuyCurve(constants.ZERO_ADDRESS, {
                    from: curveOwner
                });
                expect(await bondingCurve.buyCurve({from: miscUser})).to.be.equal(
                    constants.ZERO_ADDRESS
                );
            });

            it('should not allow non-owner to set new buy curve', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                await expectRevert.unspecified(
                    bondingCurve.setBuyCurve(constants.ZERO_ADDRESS, {
                        from: miscUser
                    })
                );
            });

            it('should allow owner to set new reserve percentage', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const newReservePercentage = '20';

                let tx = await bondingCurve.setReservePercentage(newReservePercentage, {
                    from: curveOwner
                });
                expect(await bondingCurve.reservePercentage({from: miscUser})).to.be.bignumber.equal(
                    newReservePercentage
                );
            });

            it('should not allow non-owner to set new reserve percentage', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const newReservePercentage = '20';

                await expectRevert.unspecified(
                    bondingCurve.setReservePercentage(newReservePercentage, {
                        from: miscUser
                    })
                );
            });

            it('should allow owner to set new dividend percentage', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const newDividendPercentage = '20';

                let tx = await bondingCurve.setDividendPercentage(newDividendPercentage, {
                    from: curveOwner
                });
                expect(await bondingCurve.dividendPercentage({from: miscUser})).to.be.bignumber.equal(
                    newDividendPercentage
                );
            });

            it('should not allow non-owner to set new dividend percentage', async function () {
                const eco = new CurveEcosystem(accountsConfig, config);
                const {bondingCurve, paymentToken, bondedToken, buyCurve} = await eco.init(web3);

                const newDividendPercentage = '20';

                await expectRevert.unspecified(
                    bondingCurve.setDividendPercentage(newDividendPercentage, {
                        from: miscUser
                    })
                );
            });
        });
    })
}

module.exports = {
    bondingCurveAdminTests
}

