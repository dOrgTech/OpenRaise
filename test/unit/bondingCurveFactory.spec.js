const {
  bondingCurveFactoryCurveDeployTests
} = require('../behaviors/factory/bondingCurveFactoryDeployCurve');
const {bondingCurveFactoryInitTests} = require('../behaviors/factory/bondingCurveFactoryInit');
const {
  defaultTestConfig,
  defaultTestConfigEtherStatic,
  defaultTestConfigEtherPolynomial,
  defaultTestConfigBancor
} = require('../helpers/ecosystemConfigs');

const configs = [
  // defaultTestConfig,
  // defaultTestConfigEtherStatic,
  // defaultTestConfigEtherPolynomial,
  defaultTestConfigBancor
];

configs.forEach(config => {
  const suiteString = `Factory Tests, Collateral Type: ${config.deployParams.collateralType}, Curve Type: ${config.deployParams.curveLogicType}`;
  bondingCurveFactoryInitTests(suiteString, config);
  bondingCurveFactoryCurveDeployTests(suiteString, config);
});
