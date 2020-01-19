const inquirer = require('inquirer');
const {Actions, CurveTypes, CollateralTypes} = require('./enums');

module.exports = {
  askMenuAction: () => {
    const questions = [
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [Actions.DEPLOY_ECOSYSTEM, Actions.DEPLOY_CURVE],
        default: Actions.DEPLOY_ECOSYSTEM
      }
    ];
    return inquirer.prompt(questions);
  },
  askCurveParameters: () => {
    const questions = [
      {
        type: 'list',
        name: 'curveType',
        message: 'Curve Logic',
        choices: [CurveTypes.STATIC, CurveTypes.BANCOR],
        default: CurveTypes.STATIC
      },
      {
        type: 'list',
        name: 'collateral',
        message: 'Collateral Type',
        choices: [CollateralTypes.ETH, CollateralTypes.ERC20],
        default: CollateralTypes.ETH
      }
    ];
    return inquirer.prompt(questions);
  }
};
