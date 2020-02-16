const {CurveLogicType, TokenType} = require('./CurveEcosystemConfig');
const {bn, toWad} = require('./utils');

const defaultTestConfig = {
  deployParams: {
    collateralType: TokenType.ERC20,
    curveLogicType: CurveLogicType.CONSTANT,
    curveParams: {
      reservePercentage: bn(10),
      dividendPercentage: bn(50),
      preMintAmount: toWad(0)
    },
    bondedTokenParams: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: bn(18)
    },
    collateralTokenParams: {
      name: 'PaymentToken',
      symbol: 'Pay',
      decimals: 18,
      initialSupply: bn(1000000000)
    },
    curveLogicParams: {
      tokenRatio: bn(100000000)
    }
  }
};

const defaultTestConfigEtherStatic = {
  deployParams: {
    collateralType: TokenType.ETHER,
    curveLogicType: CurveLogicType.CONSTANT,
    curveParams: {
      reservePercentage: bn(10),
      dividendPercentage: bn(50),
      preMintAmount: toWad(0)
    },
    bondedTokenParams: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: bn(18)
    },
    collateralTokenParams: {
      name: 'PaymentToken',
      symbol: 'Pay',
      decimals: 18,
      initialSupply: bn(1000000000)
    },
    curveLogicParams: {
      tokenRatio: bn(100000000)
    }
  }
};

const defaultTestConfigEtherPolynomial = {
  deployParams: {
    collateralType: TokenType.ETHER,
    curveLogicType: CurveLogicType.POLYNOMIAL,
    curveParams: {
      reservePercentage: bn(10),
      dividendPercentage: bn(50),
      preMintAmount: toWad(0)
    },
    bondedTokenParams: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: bn(18)
    },
    collateralTokenParams: {
      name: 'PaymentToken',
      symbol: 'Pay',
      decimals: 18,
      initialSupply: bn(1000000000)
    },
    curveLogicParams: {
      tokenRatio: bn(100000000)
    }
  }
};

const defaultTestConfigBancor = {
  deployParams: {
    collateralType: TokenType.ERC20,
    curveLogicType: CurveLogicType.BANCOR,
    curveParams: {
      reservePercentage: bn(10),
      dividendPercentage: bn(50),
      preMintAmount: toWad(0)
    },
    bondedTokenParams: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: bn(18)
    },
    collateralTokenParams: {
      name: 'PaymentToken',
      symbol: 'Pay',
      decimals: 18,
      initialSupply: bn(1000000000)
    },
    curveLogicParams: {
      tokenRatio: bn(500000)
    }
  }
};

module.exports = {
  defaultTestConfig,
  defaultTestConfigEtherStatic,
  defaultTestConfigEtherPolynomial,
  defaultTestConfigBancor
};
