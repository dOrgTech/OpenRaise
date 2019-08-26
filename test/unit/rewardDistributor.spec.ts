// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();

require('../setup');
const {deployProject, deployRewardsDistributorWrapper} = require('../../index.js');

var TEN18 = new BN(String(10**18))

var PPB = new BN(String(10**9))


contract('RewardsDistributorWrapper', accounts => {
  let tx;
  let project;

  const creator = accounts[0];
  const initializer = accounts[1];

  beforeEach(async function() {
    project = await deployProject();
    rd = await deployRewardsDistributorWrapper(project);
  });

  it("deploys and initializes", async function() {
    let stakeTotal = await rd.methods.getStakeTotal().call({from: initializer});
    assert.equal(stakeTotal, 0, "stakeTotal is NOT zero!");
  });

  it("deposit A, getStake, withdrawAllStake, getStake", async function() {
    var acct_a = accounts[1];

    var amount = (new BN("100")).mul(TEN18);

    let r1 = await rd.methods.deposit(acct_a, amount.toString()).call({from: acct_a});
    expect(r1).to.be.equal(true);

    let stakeTotal = await rd.methods.getStakeTotal().call({from: initializer});
    expect(new BN(stakeTotal)).to.be.bignumber.equal(amount);

    let stake = await rd.methods.getStake(acct_a).call({from: acct_a});
    expect(new BN(stake)).to.be.bignumber.equal(amount);

    await rd.methods.withdrawAllStake().call({from: acct_a});
    let _stakeFinal = await rd.methods.getStake(acct_a).call({from: acct_a});
    expect(new BN(stakeTotal)).to.be.bignumber.equal(0);
  });

})