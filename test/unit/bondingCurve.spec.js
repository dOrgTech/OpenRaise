// Import all required modules from openzeppelin-test-helpers
const {bondingCurveDeployTests} = require('../behaviors/bondingCurveDeploy');
const {bondingCurveAdminTests} = require('../behaviors/bondingCurveAdmin');
const {bondingCurvePaymentTests} = require('../behaviors/bondingCurvePayment');
const {bondingCurveBuySellTests} = require('../behaviors/bondingCurveBuySell');
const {bondingCurveBuySellEtherTests} = require('../behaviors/bondingCurveBuySellEther');
const {bondingCurveMilestoneCapTests} = require('../behaviors/bondingCurveMilestoneCap');
const {defaultTestConfig, defaultTestConfigEtherStatic} = require('../helpers/ecosystemConfigs');
/*
  Uses StaticCurveLogic for simpler tests.
*/

/*
  ERC20 Collateral.
*/

bondingCurveDeployTests('Bonding Curve - Static Curve, ERC20 Collateral', defaultTestConfig);
bondingCurveAdminTests('Bonding Curve - Static Curve, ERC20 Collateral', defaultTestConfig);
// bondingCurvePaymentTests('Bonding Curve - Static Curve, ERC20 Collateral', defaultTestConfig);
bondingCurveBuySellTests('Bonding Curve - Static Curve, ERC20 Collateral', defaultTestConfig);
// bondingCurveMilestoneCapTests('Bonding Curve - Static Curve, ERC20 Collateral', defaultTestConfig);

/*
  Ether Collateral.
*/

bondingCurveDeployTests(
  'Bonding Curve - Static Curve, Ether Collateral',
  defaultTestConfigEtherStatic
);
bondingCurveAdminTests(
  'Bonding Curve - Static Curve, Ether Collateral',
  defaultTestConfigEtherStatic
);
bondingCurveBuySellEtherTests(
  'Bonding Curve - Static Curve, Ether Collateral',
  defaultTestConfigEtherStatic
);

// bondingCurveBuySellEtherTests(
//   'Bonding Curve - Static Curve, Ether Collateral',
//   defaultTestConfigEtherStatic
// );

/*
  Uses BancorCurveLogic
*/
