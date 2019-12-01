// Import all required modules from openzeppelin-test-helpers
const {bondingCurveDeployTests} = require('../behaviors/bondingCurveDeploy');
const {bondingCurveAdminTests} = require('../behaviors/bondingCurveAdmin');
const {bondingCurvePaymentTests} = require('../behaviors/bondingCurvePayment');
const {bondingCurveBuySellTests} = require('../behaviors/bondingCurveBuySell');
const {defaultTestConfig} = require('../helpers/ecosystemConfigs');
/*
  Uses StaticCurveLogic for simpler tests.
*/

bondingCurveBuySellTests('Bonding Curve - Static Curve, Typical Values', defaultTestConfig);
