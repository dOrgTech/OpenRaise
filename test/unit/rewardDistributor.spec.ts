// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const expectEvent = require('../expectEvent');

require('../setup');

const {deployProject, deployRewardsDistributor} = require('../../index.js');

var TEN18 = new BN(String(10 ** 18));

var PPB = new BN(String(10 ** 9));

contract('RewardsDistributor', accounts => {
  let project;
  let rd;
  let tx;
  let ELIGIBLE_UNIT;

  let creator = accounts[1];

  let acct_a = accounts[2];
  let acct_b = accounts[3];
  let acct_c = accounts[4];
  let acct_d = accounts[5];

  beforeEach(async function() {
    project = await deployProject();
    rd = await deployRewardsDistributor(project, [creator]);
    ELIGIBLE_UNIT = rd.ELIGIBLE_UNIT;
  });

  it('deploys and initializes', async function() {
    expect(await rd.methods.getStakeTotal().call({from: creator})).to.be.equal('0');
  });

  it('withdraws ZERO reward', async function() {
    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: new BN('0')
    });
  });

  it('reads ZERO stake', async function() {
    expect(await rd.methods.getStake(acct_a).call({from: creator})).to.be.equal('0');
  });

  it('reverts if trying to withdraw amount > stake', async function() {
    await expectRevert.unspecified(rd.methods.withdrawStake(acct_a, '1').send({from: creator}));
  });

  it('updates total stake after deposit > ELIGIBLE_UNIT', async function() {
    var amount = new BN('100').mul(TEN18);

    tx = await rd.methods.deposit(acct_a, amount.toString()).send({from: creator});

    expectEvent.inLogs(tx.events, 'DepositMade', {
      from: creator,
      value: amount
    });

    expect(await rd.methods.getStakeTotal().call({from: creator})).to.be.equal(amount.toString());
  });

  it("doesn't update total stake after deposit < ELIGIBLE_UNIT", async function() {
    var amount = new BN('100');

    tx = await rd.methods.deposit(acct_a, amount.toString()).send({from: creator});

    expect(await rd.methods.getStakeTotal().call({from: creator})).to.be.equal('0');
  });

  it('deposits A, gets stake, withdraws all stake, gets stake again', async function() {
    var amount = new BN('100').mul(TEN18);

    tx = await rd.methods.deposit(acct_a, amount.toString()).send({from: creator});

    expect(await rd.methods.getStake(acct_a).call({from: creator})).to.be.equal(amount.toString());

    await rd.methods.withdrawAllStake(acct_a).send({from: creator});

    expect(await rd.methods.getStake(acct_a).call({from: creator})).to.be.equal('0');
  });

  it('does no distribution if no stake >= ELIGIBLE_UNIT', async function() {
    await rd.methods.deposit(acct_a, '1234').send({from: creator});

    await rd.methods.distribute(creator, '1234000').send({from: creator});

    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal('0');
  });

  it('does no distribution if stake becomes ineligible after withdrawl', async function() {
    var amountDeposit = new BN('100').mul(TEN18);
    var amountWithdraw = new BN('100').mul(TEN18).sub(new BN('10000'));

    await rd.methods.deposit(acct_a, amountDeposit.toString()).send({from: creator});

    tx = await rd.methods.withdrawStake(acct_a, amountWithdraw.toString()).send({from: creator});
    expectEvent.inLogs(tx.events, 'StakeWithdrawalMade', {
      to: acct_b,
      value: amountWithdraw
    });

    await rd.methods.distribute(creator, '1234000').send({from: creator});

    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal('0');

    // stake of A is 10000 but because it is < ELIGIBLE_UNIT total stake
    // should be zero
    expect(await rd.methods.getStake(acct_a).call({from: creator})).to.be.equal('10000');

    expect(await rd.methods.getStakeTotal().call({from: creator})).to.be.equal('0');
  });

  it('allocates all reward to a single staker and allow its withdrawl', async function() {
    var amountDeposit = new BN('100').mul(TEN18);
    var amountDistribute = new BN('200').mul(TEN18);

    await rd.methods.deposit(acct_a, amountDeposit.toString()).send({from: creator});

    tx = await rd.methods.distribute(creator, amountDistribute.toString()).send({from: creator});
    expectEvent.inLogs(tx.events, 'DistributionMade', {
      from: 0,
      value: amountDistribute
    });

    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal(
      amountDistribute.toString()
    );

    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: amountDistribute
    });

    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal('0');
  });

  it('allocates no reward to stake <= ELIGIBLE_UNIT', async function() {
    await rd.methods.deposit(acct_a, String(10 ** 9)).send({from: creator});
    await rd.methods.deposit(acct_b, String(100)).send({from: creator});

    var distribute1 = new BN('100').mul(TEN18);
    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});

    // all reward goes to A
    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal(
      distribute1.toString()
    );

    expect(await rd.methods.getReward(acct_b).call({from: creator})).to.be.equal('0');
  });

  it('allocates 1st reward proportionally to 2 stakers and 2nd reward to remaining staker after the other withdrew', async function() {
    var depositA = new BN(String(10 * 10 ** 9)); // 10 ELIGIBLE_UNITS
    var depositB = new BN(String(30 * 10 ** 9));
    var distribute1 = new BN('400'); // notice this is in wei
    var distribute2 = new BN('900');

    await rd.methods.deposit(acct_a, depositA.toString()).send({from: creator});
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: creator});
    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});

    // second distribution after A has withdrawn entirely
    await rd.methods.withdrawAllStake(acct_a).send({from: creator});
    await rd.methods.distribute(creator, distribute2.toString()).send({from: creator});

    expect(await rd.methods.getReward(acct_b).call({from: creator})).to.be.equal('1200');

    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal('100');
  });

  it('withdraws reward after proportional reward distribution', async function() {
    var depositA = new BN('100').mul(TEN18);
    var depositB = new BN('300').mul(TEN18);
    var distribute1 = new BN('40').mul(TEN18);

    await rd.methods.deposit(acct_a, depositA.toString()).send({from: creator});
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: creator});
    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});

    tx = await rd.methods.withdrawReward(acct_b).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_b,
      value: new BN('30').mul(TEN18)
    });
  });

  it('withdraws reward after two consecutive reward distributions', async function() {
    var depositA = new BN('100').mul(TEN18);
    var depositB = new BN('300').mul(TEN18);
    var distribute1 = new BN('400').mul(TEN18);

    await rd.methods.deposit(acct_a, depositA.toString()).send({from: creator});
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: creator});
    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});

    var distribute2 = new BN('4000').mul(TEN18);
    await rd.methods.distribute(creator, distribute2.toString()).send({from: creator});

    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: new BN('1100').mul(TEN18)
    });

    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: new BN('0')
    });

    tx = await rd.methods.withdrawReward(acct_b).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_b,
      value: new BN('3300').mul(TEN18)
    });
  });

  it('distributes after partial stake withdrawal and reads reward', async function() {
    var depositA = new BN('100').mul(TEN18);
    var depositB = new BN('300').mul(TEN18);
    var distribute1 = new BN('100').mul(TEN18);
    var withdrawB = new BN('200').mul(TEN18);
    var distribute2 = new BN('100').mul(TEN18);

    await rd.methods.deposit(acct_a, depositA.toString()).send({from: creator});
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: creator});
    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});

    tx = await rd.methods.withdrawStake(acct_b, withdrawB.toString()).send({from: creator});
    expectEvent.inLogs(tx.events, 'StakeWithdrawalMade', {
      to: acct_b,
      value: withdrawB
    });

    await rd.methods.distribute(creator, distribute2.toString()).send({from: creator});

    expect(await rd.methods.getStakeTotal().call({from: creator})).to.be.equal(
      String(200 * 10 ** 18)
    );

    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal(
      String(75 * 10 ** 18)
    );

    expect(await rd.methods.getReward(acct_b).call({from: creator})).to.be.equal(
      String(125 * 10 ** 18)
    );
  });

  it('withdraws reward after stake has been withdrawn', async function() {
    var depositA = new BN('100').mul(TEN18);
    var distribute1 = new BN('10').mul(TEN18);

    await rd.methods.deposit(acct_a, depositA.toString()).send({from: creator});
    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});

    tx = await rd.methods.withdrawStake(acct_a, depositA.toString()).send({from: creator});
    expectEvent.inLogs(tx.events, 'StakeWithdrawalMade', {
      to: acct_b,
      value: depositA
    });

    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: distribute1
    });

    expect(await rd.methods.getStakeTotal().call({from: creator})).to.be.equal('0');
  });

  it('handles magnitude: A deposits 9999, B deposits 1, distribute, withdraw stake, distribute, withdraw reward', async function() {
    var depositA = new BN('9999').mul(TEN18);
    var depositB = new BN('1').mul(TEN18);
    var distribute1 = new BN('1').mul(TEN18);
    var distribute2 = new BN('2').mul(TEN18);

    await rd.methods.deposit(acct_a, depositA.toString()).send({from: creator});
    await rd.methods.deposit(acct_b, depositB.toString()).send({from: creator});

    await rd.methods.distribute(creator, distribute1.toString()).send({from: creator});
    await rd.methods.withdrawAllStake(acct_a).send({from: creator});
    await rd.methods.distribute(creator, distribute2.toString()).send({from: creator});

    expect(await rd.methods.getReward(acct_b).call({from: creator})).to.be.equal(
      '2000100000000000000'
    );
  });

  it('handles magnitude: deposit 10**6 10**9 10**12 10**15, distribute, withdraw reward', async function() {
    await rd.methods.deposit(acct_a, String(10 ** 6)).send({from: creator});
    await rd.methods.deposit(acct_b, String(10 ** 9)).send({from: creator});
    await rd.methods.deposit(acct_c, String(10 ** 12)).send({from: creator});
    // 10**6 is NOT substracted so B + C + D stakes sum up to 10 ** 15
    await rd.methods.deposit(acct_d, String(10 ** 15 - 10 ** 12 - 10 ** 9)).send({from: creator});

    await rd.methods.distribute(creator, String(10 ** 9)).send({from: creator});

    // A gets no reward because its stake is below ELIGIBLE_UNIT
    expect(await rd.methods.getReward(acct_a).call({from: creator})).to.be.equal('0');

    expect(await rd.methods.getReward(acct_b).call({from: creator})).to.be.equal('1000');

    expect(await rd.methods.getReward(acct_c).call({from: creator})).to.be.equal('1000000');

    expect(await rd.methods.getReward(acct_d).call({from: creator})).to.be.equal(
      String(10 ** 9 - 10 ** 6 - 10 ** 3)
    );
  });

  it('carries remainder to second distribution and withdraws reward', async function() {
    await rd.methods.deposit(acct_a, String(10 ** 9)).send({from: creator});
    await rd.methods.deposit(acct_b, String(9 * 10 ** 9)).send({from: creator});

    // 19 wei can not be divided to 10 ELIGIBLE_UNITS; So only 10 wei
    // will be distributed and 9 will be stored as remainder and
    // added to the next distribution
    await rd.methods.distribute(creator, String(19)).send({from: creator});

    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: 1
    });

    tx = await rd.methods.withdrawReward(acct_b).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_b,
      value: 9
    });

    // 9 wei remainder + 1 new wei can now be divided to 10 EILIGIBLE_UNITS
    await rd.methods.distribute(creator, String(1)).send({from: creator});

    tx = await rd.methods.withdrawReward(acct_a).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_a,
      value: 1
    });

    tx = await rd.methods.withdrawReward(acct_b).send({from: creator});
    expectEvent.inLogs(tx.events, 'RewardWithdrawalMade', {
      to: acct_b,
      value: 9
    });
  });
});
