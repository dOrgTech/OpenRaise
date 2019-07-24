/* eslint-disable */

const helpers = require('./helpers');
const constants = require('./constants');
const AbsoluteVote = artifacts.require('./AbsoluteVote.sol');
const GenericScheme = artifacts.require('./GenericScheme.sol');
const DaoCreator = artifacts.require('./DaoCreator.sol');
const ControllerCreator = artifacts.require('./ControllerCreator.sol');
const ERC20Mock = artifacts.require('./ERC20Mock.sol');
const ActionMock = artifacts.require('./ActionMock.sol');
const Wallet = artifacts.require('./Wallet.sol');

//Setup env
//Deploy CurveService
//Deploy Factory

//Factory address

//Deploy static curve via a generic action
//Deploy bancor curve via a generic action
export class GenericSchemeParams {
  constructor() {}
}

const setupGenericSchemeParams = async function(
  genericScheme,
  accounts,
  contractToCall,
  genesisProtocol = false,
  tokenAddress = 0
) {
  var genericSchemeParams = new GenericSchemeParams();
  if (genesisProtocol === true) {
    genericSchemeParams.votingMachine = await helpers.setupGenesisProtocol(
      accounts,
      tokenAddress,
      0,
      helpers.NULL_ADDRESS
    );
    await genericScheme.setParameters(
      genericSchemeParams.votingMachine.params,
      genericSchemeParams.votingMachine.genesisProtocol.address,
      contractToCall
    );
    genericSchemeParams.paramsHash = await genericScheme.getParametersHash(
      genericSchemeParams.votingMachine.params,
      genericSchemeParams.votingMachine.genesisProtocol.address,
      contractToCall
    );
  } else {
    genericSchemeParams.votingMachine = await helpers.setupAbsoluteVote(
      helpers.NULL_ADDRESS,
      50,
      genericScheme.address
    );
    await genericScheme.setParameters(
      genericSchemeParams.votingMachine.params,
      genericSchemeParams.votingMachine.absoluteVote.address,
      contractToCall
    );
    genericSchemeParams.paramsHash = await genericScheme.getParametersHash(
      genericSchemeParams.votingMachine.params,
      genericSchemeParams.votingMachine.absoluteVote.address,
      contractToCall
    );
  }

  return genericSchemeParams;
};

const setup = async function(
  accounts,
  contractToCall = 0,
  reputationAccount = 0,
  genesisProtocol = false,
  tokenAddress = 0
) {
  var testSetup = new helpers.TestSetup();
  testSetup.standardTokenMock = await ERC20Mock.new(accounts[1], 100);
  testSetup.genericScheme = await GenericScheme.new();
  var controllerCreator = await ControllerCreator.new({gas: constants.ARC_GAS_LIMIT});
  testSetup.daoCreator = await DaoCreator.new(controllerCreator.address, {
    gas: constants.ARC_GAS_LIMIT
  });
  testSetup.reputationArray = [20, 10, 70];

  if (reputationAccount === 0) {
    testSetup.org = await helpers.setupOrganizationWithArrays(
      testSetup.daoCreator,
      [accounts[0], accounts[1], accounts[2]],
      [1000, 1000, 1000],
      testSetup.reputationArray
    );
  } else {
    testSetup.org = await helpers.setupOrganizationWithArrays(
      testSetup.daoCreator,
      [accounts[0], accounts[1], reputationAccount],
      [1000, 1000, 1000],
      testSetup.reputationArray
    );
  }
  testSetup.genericSchemeParams = await setupGenericSchemeParams(
    testSetup.genericScheme,
    accounts,
    contractToCall,
    genesisProtocol,
    tokenAddress
  );
  var permissions = '0x00000010';

  await testSetup.daoCreator.setSchemes(
    testSetup.org.avatar.address,
    [testSetup.genericScheme.address],
    [testSetup.genericSchemeParams.paramsHash],
    [permissions],
    'metaData'
  );

  return testSetup;
};

const createCallToActionMock = async function(_avatar, _actionMock) {
  return await new web3.eth.Contract(_actionMock.abi).methods.test2(_avatar).encodeABI();
};

contract('genericScheme', function(accounts) {
  before(function() {
    helpers.etherForEveryone(accounts);
  });
  it('setParameters', async function() {
    var genericScheme = await GenericScheme.new();
    var absoluteVote = await AbsoluteVote.new();
    await genericScheme.setParameters('0x1234', absoluteVote.address, accounts[0]);
    var paramHash = await genericScheme.getParametersHash(
      '0x1234',
      absoluteVote.address,
      accounts[0]
    );
    var parameters = await genericScheme.parameters(paramHash);
    assert.equal(parameters[0], absoluteVote.address);
    assert.equal(parameters[2], accounts[0]);
  });

  it('proposeCall log', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    var callData = await createCallToActionMock(testSetup.org.avatar.address, actionMock);

    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'NewCallProposal');
  });

  it('execute proposeCall -no decision - proposal data delete', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    var callData = await createCallToActionMock(testSetup.org.avatar.address, actionMock);
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');
    await testSetup.genericSchemeParams.votingMachine.absoluteVote.vote(
      proposalId,
      0,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    //check organizationsProposals after execution
    var organizationProposal = await testSetup.genericScheme.organizationsProposals(
      testSetup.org.avatar.address,
      proposalId
    );
    assert.equal(organizationProposal.passed, false);
    assert.equal(organizationProposal.callData, null);
  });

  it('execute proposeVote -positive decision - proposal data delete', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    var callData = await createCallToActionMock(testSetup.org.avatar.address, actionMock);
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');
    var organizationProposal = await testSetup.genericScheme.organizationsProposals(
      testSetup.org.avatar.address,
      proposalId
    );
    assert.equal(organizationProposal[0], callData, helpers.NULL_HASH);
    await testSetup.genericSchemeParams.votingMachine.absoluteVote.vote(
      proposalId,
      1,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    //check organizationsProposals after execution
    organizationProposal = await testSetup.genericScheme.organizationsProposals(
      testSetup.org.avatar.address,
      proposalId
    );
    assert.equal(organizationProposal.callData, null); //new contract address
  });

  it('execute proposeVote -positive decision - destination reverts', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    var callData = await createCallToActionMock(helpers.NULL_ADDRESS, actionMock);
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');

    await testSetup.genericSchemeParams.votingMachine.absoluteVote.vote(
      proposalId,
      1,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    //actionMock revert because msg.sender is not the _addr param at actionMock thpugh the generic scheme not .
    var organizationProposal = await testSetup.genericScheme.organizationsProposals(
      testSetup.org.avatar.address,
      proposalId
    );
    assert.equal(organizationProposal.exist, true); //new contract address
    assert.equal(organizationProposal.passed, true); //new contract address
    //can call execute
    await testSetup.genericScheme.execute(testSetup.org.avatar.address, proposalId);
  });

  it('execute proposeVote -positive decision - destination reverts and then active', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    var activationTime = (await web3.eth.getBlock('latest')).timestamp + 1000;
    await actionMock.setActivationTime(activationTime);
    var callData = await new web3.eth.Contract(actionMock.abi).methods.test3().encodeABI();
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');

    await testSetup.genericSchemeParams.votingMachine.absoluteVote.vote(
      proposalId,
      1,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    //actionMock revert because msg.sender is not the _addr param at actionMock thpugh the generic scheme not .
    var organizationProposal = await testSetup.genericScheme.organizationsProposals(
      testSetup.org.avatar.address,
      proposalId
    );
    assert.equal(organizationProposal.exist, true); //new contract address
    assert.equal(organizationProposal.passed, true); //new contract address
    //can call execute
    await testSetup.genericScheme.execute(testSetup.org.avatar.address, proposalId);
    await helpers.increaseTime(1001);
    await testSetup.genericScheme.execute(testSetup.org.avatar.address, proposalId);

    organizationProposal = await testSetup.genericScheme.organizationsProposals(
      testSetup.org.avatar.address,
      proposalId
    );
    assert.equal(organizationProposal.exist, false); //new contract address
    assert.equal(organizationProposal.passed, false); //new contract address
    try {
      await testSetup.genericScheme.execute(testSetup.org.avatar.address, proposalId);
      assert(false, 'cannot call execute after it been executed');
    } catch (error) {
      helpers.assertVMException(error);
    }
  });

  it('execute proposeVote without return value-positive decision - check action', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    const encodeABI = await new web3.eth.Contract(actionMock.abi).methods
      .withoutReturnValue(testSetup.org.avatar.address)
      .encodeABI();
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      encodeABI,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');

    await testSetup.genericSchemeParams.votingMachine.absoluteVote.vote(
      proposalId,
      1,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
  });

  it('execute should fail if not executed from votingMachine', async function() {
    var actionMock = await ActionMock.new();
    var testSetup = await setup(accounts, actionMock.address);
    const encodeABI = await new web3.eth.Contract(actionMock.abi).methods
      .withoutReturnValue(testSetup.org.avatar.address)
      .encodeABI();
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      encodeABI,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');

    try {
      await testSetup.genericScheme.execute(testSetup.org.avatar.address, proposalId);
      assert(false, 'execute should fail if not executed from votingMachine');
    } catch (error) {
      helpers.assertVMException(error);
    }
  });

  it('execute proposeVote -positive decision - check action - with GenesisProtocol', async function() {
    var actionMock = await ActionMock.new();
    var standardTokenMock = await ERC20Mock.new(accounts[0], 1000);
    var testSetup = await setup(accounts, actionMock.address, 0, true, standardTokenMock.address);
    var value = 123;
    var callData = await createCallToActionMock(testSetup.org.avatar.address, actionMock);
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      value,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');
    //transfer some eth to avatar
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: testSetup.org.avatar.address,
      value: web3.utils.toWei('1', 'ether')
    });
    assert.equal(await web3.eth.getBalance(actionMock.address), 0);
    tx = await testSetup.genericSchemeParams.votingMachine.genesisProtocol.vote(
      proposalId,
      1,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    await testSetup.genericScheme
      .getPastEvents('ProposalExecutedByVotingMachine', {
        fromBlock: tx.blockNumber,
        toBlock: 'latest'
      })
      .then(function(events) {
        assert.equal(events[0].event, 'ProposalExecutedByVotingMachine');
        assert.equal(events[0].args._param, 1);
      });
    assert.equal(await web3.eth.getBalance(actionMock.address), value);
  });

  it('execute proposeVote -negative decision - check action - with GenesisProtocol', async function() {
    var actionMock = await ActionMock.new();
    var standardTokenMock = await ERC20Mock.new(accounts[0], 1000);
    var testSetup = await setup(accounts, actionMock.address, 0, true, standardTokenMock.address);

    var callData = await createCallToActionMock(testSetup.org.avatar.address, actionMock);
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');
    tx = await testSetup.genericSchemeParams.votingMachine.genesisProtocol.vote(
      proposalId,
      2,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    await testSetup.genericScheme
      .getPastEvents('ProposalExecutedByVotingMachine', {
        fromBlock: tx.blockNumber,
        toBlock: 'latest'
      })
      .then(function(events) {
        assert.equal(events[0].event, 'ProposalExecutedByVotingMachine');
        assert.equal(events[0].args._param, 2);
      });
  });

  it('Wallet - execute proposeVote -positive decision - check action - with GenesisProtocol', async function() {
    var wallet = await Wallet.new();
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: wallet.address,
      value: web3.utils.toWei('1', 'ether')
    });
    var standardTokenMock = await ERC20Mock.new(accounts[0], 1000);
    var testSetup = await setup(accounts, wallet.address, 0, true, standardTokenMock.address);
    var callData = await new web3.eth.Contract(wallet.abi).methods.pay(accounts[1]).encodeABI();
    var tx = await testSetup.genericScheme.proposeCall(
      testSetup.org.avatar.address,
      callData,
      0,
      helpers.NULL_HASH
    );
    var proposalId = await helpers.getValueFromLogs(tx, '_proposalId');
    assert.equal(await web3.eth.getBalance(wallet.address), web3.utils.toWei('1', 'ether'));
    await testSetup.genericSchemeParams.votingMachine.genesisProtocol.vote(
      proposalId,
      1,
      0,
      helpers.NULL_ADDRESS,
      {from: accounts[2]}
    );
    assert.equal(await web3.eth.getBalance(wallet.address), web3.utils.toWei('1', 'ether'));
    await wallet.transferOwnership(testSetup.org.avatar.address);
    await testSetup.genericScheme.execute(testSetup.org.avatar.address, proposalId);
    assert.equal(await web3.eth.getBalance(wallet.address), 0);
  });
});
