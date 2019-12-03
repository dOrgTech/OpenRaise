const {defaultTestConfig} = require('../test/helpers/ecosystemConfigs');
const {CurveEcosystem} = require("../test/helpers/CurveEcosystem");
const {CurveLogicType, TokenType} = require("../test/helpers/CurveEcosystemConfig");
const {bn} = require("../test/helpers/utils");

const config = {
    deployParams: {
        collateralType: TokenType.ERC20,
        curveLogicType: CurveLogicType.STATIC,
        curveParams: {
            reservePercentage: bn(10),
            dividendPercentage: bn(50),
        },
        bondedTokenParams: {
            name: 'BondedToken',
            symbol: 'BND',
            decimals: bn(18)
        },
        collateralTokenParams: {
            name: "PaymentToken",
            symbol: "Pay",
            decimals: 18,
            initialSupply: bn(1000000000)
        },
        curveLogicParams: {
            tokenRatio: bn(100000000)
        }
    }
}

const printDeployed
(contracts)
{
    // console.log(`Bonding Curve: ${contracts.bondingCurve}`);
    // console.log(`Bonded Token: ${contracts.bondedToken}`);
    // console.log(`Buy Curve: ${contracts.bondedToken}`);
}

const deployBondingCurve = async (config) => {
    const accounts = await web3.eth.getAccounts();
    // const eco = new CurveEcosystem(config);
    // const {bondingCurve, bondedToken, buyCurve} = await eco.init(web3);}

}

module.exports = async (callback) => {
    const deployed = await deployBondingCurve(config);
    printDeployed(deployed);
    process.exit();
}