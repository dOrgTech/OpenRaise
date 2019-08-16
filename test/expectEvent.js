const {expect} = require('chai');
const {web3, BN} = require('../node_modules/openzeppelin-test-helpers/src/setup');

function getParameter(event, parameterName) {
  const parameterList = event.returnValues;

  expect(parameterList[parameterName]).to.not.be.equal(
    undefined,
    `No '${parameterName}' parameter found`
  );

  return parameterList[parameterName];
}

function inLogs(logs, eventName, eventArgs = {}) {
  let matchingEvents = [];

  if (!logs) {
    return false;
  }

  Object.keys(logs).forEach(function eachKey(key) {
    if (key == eventName) {
      matchingEvents.push(logs[key]);
    }
  });

  expect(matchingEvents.length > 0).to.equal(true, `No '${eventName}' events found`);

  const exception = [];

  const matchingEvent = matchingEvents.find(event => {
    Object.keys(eventArgs).forEach(key => {
      try {
        contains(event.raw, key, eventArgs[key]);
      } catch (error) {
        exception.push(error);
        return false;
      }
    });
    return true;
  });

  if (matchingEvent === undefined) {
    throw exception[0];
  }

  return matchingEvent;
  // return true;
}

async function inConstruction(contract, eventName, eventArgs = {}) {
  return inTransaction(contract.transactionHash, contract.constructor, eventName, eventArgs);
}

async function inTransaction(txHash, emitter, eventName, eventArgs = {}) {
  const receipt = await web3.eth.getTransactionReceipt(txHash);
  const logs = emitter.decodeLogs(receipt.logs);
  return inLogs(logs, eventName, eventArgs);
}

function contains(args, key, value) {
  expect(key in args).to.equal(true, `Event argument '${key}' not found`);

  if (value === null) {
    expect(args[key]).to.equal(null);
  } else if (isBN(args[key])) {
    expect(args[key]).to.be.bignumber.equal(value);
  } else {
    expect(args[key]).to.be.equal(value);
  }
}

function isBN(object) {
  return BN.isBN(object) || object instanceof BN;
}

module.exports = {
  inLogs,
  inConstruction,
  inTransaction,
  getParameter
};
