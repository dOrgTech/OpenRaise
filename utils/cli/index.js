const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const CLI = require('clui');
const Web3 = require('web3');
const truffleConfig = require('../../truffle-config');
const inquirer = require('./lib/inquirer');
const Deployer = require('../deployer');
require('dotenv').config();

const {Spinner} = CLI;
const status = new Spinner('Deploying Ecosystem...');

const run = async () => {
  console.log(chalk.yellow(figlet.textSync('BC-DAO', {horizontalLayout: 'full'})));
  const web3 = new Web3.providers.HttpProvider(
    `http://${truffleConfig.networks.development.host}:${truffleConfig.networks.development.port}`
  );
  const deployer = new Deployer(web3);
  const credentials = await inquirer.askMenuAction();
  const curveType = await inquirer.askCurveParameters();
};

clear();
run();
