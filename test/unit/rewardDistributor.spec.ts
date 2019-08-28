// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const expectEvent = require('../expectEvent');

require('../setup');

const {deployProject, deployRewardsDistributorWrapper} = require('../../index.js');

var TEN18 = new BN(String(10 ** 18));

var PPB = new BN(String(10 ** 9));

contract('RewardsDistributorWrapper', accounts => {
  let project;
  let rd;
  let tx;
  let ELIGIBLE_UNIT;

  const creator = accounts[0];
  const initializer = accounts[1];

  beforeEach(async function() {
    project = await deployProject();
    rd = await deployRewardsDistributorWrapper(project);
    ELIGIBLE_UNIT = rd.ELIGIBLE_UNIT;
  });

  it('deploys and initializes', async function() {
    let stakeTotal = await rd.methods.getStakeTotal().call({from: initializer});
    expect(new BN(stakeTotal)).to.be.bignumber.equal(new BN(0));
  });

  it('accepts deposit A, gets stake, withdraws all stake, gets stake again', async function() {
    var acct_a = accounts[1];
    var amount = new BN('100').mul(TEN18);

    tx = await rd.methods
      .deposit(acct_a, amount.toString())
      .send({from: acct_a});

    expectEvent.inLogs(tx.events, 'DepositMade', {
      _from: acct_a,
      value: amount
    });

    let stake = await rd.methods.getStake(acct_a).call({from: acct_a});
    expect(new BN(stake)).to.be.bignumber.equal(amount);

    await rd.methods.withdrawAllStake(acct_a).send({from: acct_a});

    let stakeFinal = await rd.methods.getStake(acct_a).call({from: acct_a});
    expect(new BN(stakeFinal)).to.be.bignumber.equal(new BN(0));
  });

  it('deposit A, distribute, getReward, withdrawReward and getReward', async function() {
    var acct_a = accounts[1];
    var amountDeposit = new BN('100').mul(TEN18);
    var amountDistribute = new BN('200').mul(TEN18);

    await rd.methods.deposit(acct_a, amountDeposit.toString()).send({from: acct_a});

    tx = await rd.methods.distribute(amountDistribute.toString()).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'DistributionMade', {
      _from: acct_a,
      value: amountDistribute
    });

    // all reward is allocated to the single staker
    var currentReward = await rd.methods.getReward(acct_a).call({from: acct_a});
    expect(new BN(currentReward)).to.be.bignumber.equal(amountDistribute);

    tx = await rd.methods.withdrawReward(acct_a).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      _from: acct_a,
      value: amountDistribute
    });

    currentReward = await rd.methods.getReward(acct_a).call({from: acct_a});
    expect(new BN(currentReward)).to.be.bignumber.equal(new BN(0));
  });
    
});
