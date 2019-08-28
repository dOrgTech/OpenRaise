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

  it("withdraws ZERO reward", async function() {
    var acct_a = accounts[1];

    tx = await rd.methods.withdrawReward(acct_a).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      _from: acct_a,
      value: new BN('0')
    });
  });

  it("reads ZERO stake", async function() {
    var acct_a = accounts[1];

    let stake = await rd.methods.getStake(acct_a).call({from: acct_a});
    expect(new BN(stake)).to.be.bignumber.equal(new BN('0'));
  });

  it('deposits A, gets stake, withdraws all stake, gets stake again', async function() {
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

  it('deposits A, distributes, gets Reward, withdraws Reward and gets Reward', async function() {
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

 it("deposits A, deposits B, distributes, withdraws stake, distributes, gets reward", async function() {
    var acct_a = accounts[1];
    var acct_b = accounts[2];

    var depositA = new BN('100').mul(TEN18);
    await rd.methods.deposit(acct_a, depositA.toString()).send({from: acct_a});

    var depositB = new BN('300').mul(TEN18);
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: acct_a});

    var distribute1 = new BN('400').mul(TEN18);
    await rd.methods.distribute(distribute1.toString()).send({from: acct_a});

    var stakeA = await rd.methods.getStake(acct_a).call({from: acct_a});
    expect(new BN(stakeA)).to.be.bignumber.equal(depositA);
    await rd.methods.withdrawAllStake(acct_a).send({from: acct_a});

    // a second distribution after A has withdrawn entirely
    var distribute2 = new BN('900').mul(TEN18);
    await rd.methods.distribute(distribute2.toString()).send({from: acct_a});

    var rewardB = await rd.methods.getReward(acct_b).call({from: acct_a});
    expect(new BN(rewardB)).to.be.bignumber.equal(new BN('1200').mul(TEN18));
  });

  it("deposits A, deposits B, distributes and withdraws reward", async function() {
    var acct_a = accounts[1];
    var acct_b = accounts[2];

    var depositA = new BN('100').mul(TEN18);
    await rd.methods.deposit(acct_a, depositA.toString()).send({from: acct_a});

    var depositB = new BN('300').mul(TEN18);
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: acct_a});

    var distribute1 = new BN('40').mul(TEN18);
    await rd.methods.distribute(distribute1.toString()).send({from: acct_a});

    tx = await rd.methods.withdrawReward(acct_b).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      _from: acct_b,
      value: new BN('30').mul(TEN18)
    });
  });

  it("deposits A, deposits B, distributes X 2 and withdraws reward", async function() {
    var acct_a = accounts[1];
    var acct_b = accounts[2];

    var depositA = new BN('100').mul(TEN18);
    await rd.methods.deposit(acct_a, depositA.toString()).send({from: acct_a});

    var depositB = new BN('300').mul(TEN18);
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: acct_a});

    var distribute1 = new BN('400').mul(TEN18);
    await rd.methods.distribute(distribute1.toString()).send({from: acct_a});

    var distribute2 = new BN('4000').mul(TEN18);
    await rd.methods.distribute(distribute2.toString()).send({from: acct_a});

    tx = await rd.methods.withdrawReward(acct_a).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      _from: acct_a,
      value: new BN('1100').mul(TEN18)
    });

    tx = await rd.methods.withdrawReward(acct_a).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      _from: acct_a,
      value: new BN('0')
    });

    tx = await rd.methods.withdrawReward(acct_b).send({from: acct_a});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      _from: acct_b,
      value: new BN('3300').mul(TEN18)
    });
  });

  it("deposits A, distributes, deposits B, distributes and reads reward", async function() {
    var acct_a = accounts[1];
    var acct_b = accounts[2];

    var depositA = new BN('100').mul(TEN18);
    await rd.methods.deposit(acct_a, depositA.toString()).send({from: acct_a});

    var distribute1 = new BN('100').mul(TEN18);
    await rd.methods.distribute(distribute1.toString()).send({from: acct_a});

    var depositB = new BN('300').mul(TEN18);
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: acct_a});

    var stakeTotal = await rd.methods.getStakeTotal().call({from: acct_a});
    expect(new BN(stakeTotal)).to.be.bignumber.equal(new BN('400').mul(TEN18));

    var distribute2 = new BN('100').mul(TEN18);
    await rd.methods.distribute(distribute2.toString()).send({from: acct_a});

    var rewardA = await rd.methods.getReward(acct_a).call({from: acct_a});
    expect(new BN(rewardA)).to.be.bignumber.equal(new BN('125').mul(TEN18));

    var rewardB = await rd.methods.getReward(acct_b).call({from: acct_a});
    expect(new BN(rewardB)).to.be.bignumber.equal(new BN('75').mul(TEN18));
  });

  it("handles magnitudes: A deposits 9999, B deposits 1, distribute, withdraw stake, distribute, withdraw reward", async function() {
    var acct_a = accounts[1];
    var acct_b = accounts[2];

    var depositA = new BN('9999').mul(TEN18);
    await rd.methods.deposit(acct_a, depositA.toString()).send({from: acct_a});

    var depositB = new BN('1').mul(TEN18);
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: acct_a});

    var distribute1 = new BN('1').mul(TEN18);
    await rd.methods.distribute(distribute1.toString()).send({from: acct_a});

    await rd.methods.withdrawAllStake(acct_a).send({from: acct_a});

    var distribute2 = new BN('2').mul(TEN18);
    await rd.methods.distribute(distribute2.toString()).send({from: acct_a});

    var rewardB = await rd.methods.getReward(acct_b).call({from: acct_a});
    expect(new BN(rewardB)).to.be.bignumber.equal(new BN('2000100000000000000'));
  });
});
