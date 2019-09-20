// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();

require('../setup');
const deploy = require('../../index.js');

const {paymentTokenValues, bondedTokenValues} = require('../constants/tokenValues');

var TEN18 = new BN(String(10 ** 18));
var PPB = new BN(String(10 ** 9));

contract('BondedToken', accounts => {
  let tx;
  let result;
  let project;
  let bondedToken;
  let paymentToken;
  let rewardsDistributor;

  const creator = accounts[0];
  const controller = accounts[1];
  const userAccounts = accounts.slice(2, accounts.length);

  beforeEach(async function() {
    project = await deploy.deployProject();

    paymentToken = await deploy.deployBondedToken(project, [
      paymentTokenValues.parameters.name,
      paymentTokenValues.parameters.symbol,
      paymentTokenValues.parameters.decimals,
      controller,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    ]);

    const paymentTokenInitialBalance = new BN('600000000').mul(TEN18);

    await paymentToken.methods
      .mint(controller, paymentTokenInitialBalance.toString())
      .send({from: controller});

    rewardsDistributor = await deploy.createRewardsDistributor(project);

    bondedToken = await deploy.deployBondedToken(project, [
      bondedTokenValues.parameters.name,
      bondedTokenValues.parameters.symbol,
      bondedTokenValues.parameters.decimals,
      controller,
      rewardsDistributor.address,
      paymentToken.address
    ]);

    await rewardsDistributor.methods.initialize(bondedToken.address).send({from: controller});

    const initialBalance = new BN('1000000000').mul(TEN18);
    await bondedToken.methods.mint(controller, initialBalance.toString()).send({from: controller});
  });

  it('sets parameters correctly', async function() {
    expect(await bondedToken.methods.name().call({from: controller})).to.be.equal(
      bondedTokenValues.parameters.name
    );
    expect(await bondedToken.methods.symbol().call({from: controller})).to.be.equal(
      bondedTokenValues.parameters.symbol
    );
    expect(await bondedToken.methods.decimals().call({from: controller})).to.be.equal(
      bondedTokenValues.parameters.decimals.toString()
    );
    expect(await bondedToken.methods.getRewardsDistributor().call({from: controller})).to.be.equal(
      rewardsDistributor.address
    );
    expect(await bondedToken.methods.getDividendToken().call({from: controller})).to.be.equal(
      paymentToken.address
    );
    expect(await rewardsDistributor.methods.owner().call({from: controller})).to.be.equal(
      bondedToken.address
    );
  });

  describe('Transfer', async () => {
    beforeEach(async () => {
      const initialBalance = new BN('100').mul(TEN18);
      await paymentToken.methods
        .mint(controller, initialBalance.toString())
        .send({from: controller});
      await bondedToken.methods
        .mint(controller, initialBalance.toString())
        .send({from: controller});
    });

    it('allows valid token transfer', async function() {
      const transferValue = new BN('1').mul(TEN18);
      const recipient = userAccounts[0];

      await bondedToken.methods
        .transfer(recipient, transferValue.toString())
        .send({from: controller});
    });
  });

  describe('Burn', async function() {
    const recipient = userAccounts[2];
    const mintAmount = new BN('100').mul(TEN18);

    beforeEach(async () => {
      //Mint bonded tokens for user
      await bondedToken.methods.mint(recipient, mintAmount.toString()).send({from: controller});
    });

    it('should allow minter to burn tokens', async function() {
      tx = await bondedToken.methods
        .burn(recipient, mintAmount.toString())
        .send({from: controller});
    });

    it('should not allow non-minter to burn tokens', async function() {
      await expectRevert.unspecified(
        bondedToken.methods.burn(recipient, mintAmount.toString()).send({from: recipient})
      );
    });
  });

  describe('Rewards', async () => {
    const recipient = userAccounts[0];

    const amountDeposit = new BN('100').mul(TEN18);
    const amountDistribute = new BN('200').mul(TEN18);

    describe('Reward Distributor not set', async () => {
      let bondedTokenNoRewards;

      beforeEach(async function() {
        bondedTokenNoRewards = await deploy.deployBondedToken(project, [
          bondedTokenValues.parameters.name,
          bondedTokenValues.parameters.symbol,
          bondedTokenValues.parameters.decimals,
          controller,
          ZERO_ADDRESS,
          paymentToken.address
        ]);
      });
      it("should fail on checking reward if rewards distributor isn't set", async () => {
        await expectRevert.unspecified(
          bondedTokenNoRewards.methods.getReward(controller).call({from: controller})
        );
      });
      it("should fail on withdrawing reward if rewards distributor isn't set", async () => {
        await expectRevert.unspecified(
          bondedTokenNoRewards.methods.withdrawReward().call({from: controller})
        );
      });
      it("should fail on distribution if rewards distributor isn't set", async () => {
        await expectRevert.unspecified(
          bondedTokenNoRewards.methods
            .distribute(controller, amountDistribute.toString())
            .call({from: controller})
        );
      });

      describe('Burn without rewards distributor', async function() {
        const recipient = userAccounts[2];
        const mintAmount = new BN('100').mul(TEN18);

        beforeEach(async () => {
          //Mint bonded tokens for user
          await bondedTokenNoRewards.methods
            .mint(recipient, mintAmount.toString())
            .send({from: controller});
        });

        it('should allow minter to burn tokens', async function() {
          tx = await bondedTokenNoRewards.methods
            .burn(recipient, mintAmount.toString())
            .send({from: controller});
        });

        it('should not allow non-minter to burn tokens', async function() {
          await expectRevert.unspecified(
            bondedTokenNoRewards.methods
              .burn(recipient, mintAmount.toString())
              .send({from: recipient})
          );
        });
      });
    });

    describe('Dividend Token not set', async () => {
      let bondedTokenNoDividends;

      beforeEach(async function() {
        bondedTokenNoDividends = await deploy.deployBondedToken(project, [
          bondedTokenValues.parameters.name,
          bondedTokenValues.parameters.symbol,
          bondedTokenValues.parameters.decimals,
          controller,
          rewardsDistributor.address,
          ZERO_ADDRESS
        ]);
      });
      it("should fail on withdrawing reward if dividend token isn't set", async () => {
        await expectRevert.unspecified(
          bondedTokenNoDividends.methods.withdrawReward().call({from: controller})
        );
      });
      it("should fail on distribution if dividend token isn't set", async () => {
        await expectRevert.unspecified(
          bondedTokenNoDividends.methods
            .distribute(controller, amountDistribute.toString())
            .call({from: controller})
        );
      });
    });

    describe('Rewards Distribution', async () => {
      beforeEach(async function() {
        //Create stake for user
        await bondedToken.methods
          .mint(recipient, amountDeposit.toString())
          .send({from: controller});
      });

      describe('Pre-approval / distribution', async () => {
        it('should not allow token transfer with inadequate token balance', async () => {
          const distributor = userAccounts[2];

          await expectRevert.unspecified(
            bondedToken.methods
              .distribute(distributor, amountDistribute.toString())
              .send({from: distributor})
          );
        });

        it('should not allow token transfer with inadequate token approval', async () => {
          const distributor = userAccounts[2];

          await paymentToken.methods
            .mint(distributor, amountDistribute.toString())
            .send({from: controller});

          await expectRevert.unspecified(
            bondedToken.methods
              .distribute(distributor, amountDistribute.toString())
              .send({from: distributor})
          );
        });
      });

      describe('Post-approval / distribution', async () => {
        beforeEach(async () => {
          //Distribute reward to stakers
          await paymentToken.methods
            .approve(bondedToken.address, amountDistribute.toString())
            .send({from: controller});

          await bondedToken.methods
            .distribute(controller, amountDistribute.toString())
            .send({from: controller});
        });

        it('should not allow distribution of zero tokens', async () => {
          await expectRevert.unspecified(
            bondedToken.methods.distribute(controller, 0).send({from: controller})
          );
        });

        it('should register correct reward withdrawal value', async () => {
          const expectedReward = '19900000000000';
          expect(
            await bondedToken.methods.getReward(recipient).call({from: controller})
          ).to.be.equal(expectedReward);
        });

        it('should not allocate any reward to user without stake', async () => {
          expect(
            await bondedToken.methods.getReward(userAccounts[2]).call({from: recipient})
          ).to.be.equal('0');
        });

        it('should allow valid reward withdrawal', async () => {
          let balances = {
            before: null,
            after: null,
            expectedReward: null
          };

          balances.before = new BN(
            await paymentToken.methods.balanceOf(recipient).call({from: recipient})
          );
          balances.expectedReward = new BN(
            await bondedToken.methods.getReward(recipient).call({from: recipient})
          );

          tx = await bondedToken.methods.withdrawReward().send({from: recipient});

          balances.after = new BN(
            await paymentToken.methods.balanceOf(recipient).call({from: recipient})
          );

          expect(balances.after).to.be.bignumber.equal(
            balances.before.add(balances.expectedReward)
          );
        });
      });
    });
  });
});
