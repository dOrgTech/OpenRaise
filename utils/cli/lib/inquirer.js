const inquirer = require('inquirer');

const actions = {
  DEPLOY_ECOSYSTEM: 'Deploy Ecosystem',
  DEPLOY_CURVE: 'Deploy Curve'
};

const curveTypes = {
  STATIC: 'Static',
  BANCOR: 'Bancor'
};

const collateralType = {
  ETH: 'ETH',
  ERC20: 'ERC20'
};

module.exports = {
  askMenuAction: () => {
    const questions = [
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [actions.DEPLOY_ECOSYSTEM, actions.DEPLOY_CURVE],
        default: actions.DEPLOY_ECOSYSTEM
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
        choices: [curveTypes.STATIC, curveTypes.BANCOR],
        default: curveTypes.STATIC
      },
      {
        type: 'list',
        name: 'collateral',
        message: 'Collateral Type',
        choices: [collateralType.ETH, collateralType.ERC20],
        default: collateralType.ETH
      }
    ];
    return inquirer.prompt(questions);
  },
  actions,
  curveTypes
};
