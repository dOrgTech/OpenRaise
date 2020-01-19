const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const CLI = require('clui');
const Web3 = require('web3');
const {series} = require('async');
const Rx = require('rx');
const {exec} = require('child_process');
const inquirer = require('inquirer');
const Deployer = require('../deployer');
const {Actions, CurveTypes, CollateralTypes} = require('./lib/enums');
const runScript = require('./lib/runScript');
const truffleConfig = require('../../truffle-config');

require('dotenv').config();

const {Spinner} = CLI;
const status = new Spinner('Deploying Ecosystem...');

const web3 = new Web3(
  new Web3.providers.HttpProvider(
    `http://${truffleConfig.networks.development.host}:${truffleConfig.networks.development.port}`
  )
);
const deployer = new Deployer(web3);

const curveEcosystem = {
  implementation: {
    staticCurveLogicImpl: undefined,
    bancorCurveLogicImpl: undefined,
    bondedTokenImpl: undefined,
    bondingCurveImpl: undefined,
    rewardsDistributorImpl: undefined
  },
  instance: {
    paymentToken: undefined,
    bancorCurveService: undefined,
    factoryInstance: undefined
  }
};

const askMenuAction = () => {
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
};

const deployEcosystem = async collateralTokenParams => {
  console.log('deploying ecosystem...');

  exec(
    `npx oz publish --network development && npx oz push --network development`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`${stdout}`);
      console.error(`${stderr}`);
      run();
    }
  );
};

const deployCurve = async () => {
  // const curveParams = await inquirer.askCurveParameters();
  // console.log(curveParams);

  const prompts = new Rx.Subject();
  inquirer.prompt(prompts);

  // At some point in the future, push new questions
  prompts.next({
    /* question... */
    type: 'input',
    name: 'owner',
    message: 'Curve Beneficiary',
    choices: [CurveTypes.STATIC, CurveTypes.BANCOR],
    default: CurveTypes.STATIC
  });
  prompts.next({
    /* question... */
  });

  // When you're done
  prompts.complete();
};

const run = async () => {
  try {
    const action = await askMenuAction();
    console.log(action);

    switch (action.action) {
      case Actions.DEPLOY_ECOSYSTEM:
        await deployEcosystem();
        break;
      case Actions.DEPLOY_CURVE:
        await deployCurve();
        break;
      default:
        throw new Error('Invalid action type specified');
    }
  } catch (e) {
    console.log('[Error] ' + e);
    process.exit();
  }
};

clear();
console.log(chalk.yellow(figlet.textSync('BC-DAO', {horizontalLayout: 'full'})));
run();
