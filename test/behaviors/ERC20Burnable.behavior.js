const {BN, constants, expectEvent, shouldFail} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

function shouldBehaveLikeERC20Burnable(tokenContract, owner, initialBalance, [burner]) {
  describe('burn', function() {
    describe('when the given amount is not greater than balance of the sender', function() {
      context('for a zero amount', function() {
        shouldBurn(new BN(0));
      });

      context('for a non-zero amount', function() {
        shouldBurn(new BN(100));
      });

      function shouldBurn(amount) {
        beforeEach(async function() {
          ({logs: this.logs} = await tokenContract.burn(amount, {
            from: owner
          }));
        });

        it('burns the requested amount', async function() {
          (await tokenContract.balanceOf(owner)).should.be.bignumber.equal(
            initialBalance.sub(amount)
          );
        });

        it('emits a transfer event', async function() {
          expectEvent.inLogs(this.logs, 'Transfer', {
            from: owner,
            to: ZERO_ADDRESS,
            value: amount
          });
        });
      }
    });

    describe('when the given amount is greater than the balance of the sender', function() {
      const amount = initialBalance.addn(1);

      it('reverts', async function() {
        await shouldFail.reverting(tokenContract.burn(amount, {from: owner}));
      });
    });
  });

  describe('burnFrom', function() {
    describe('on success', function() {
      context('for a zero amount', function() {
        shouldBurnFrom(new BN(0));
      });

      context('for a non-zero amount', function() {
        shouldBurnFrom(new BN(100));
      });

      function shouldBurnFrom(amount) {
        const originalAllowance = amount.muln(3);

        beforeEach(async function() {
          await tokenContract.approve(burner, originalAllowance, {
            from: owner
          });
          const {logs} = await tokenContract.burnFrom(owner, amount, {
            from: burner
          });
          this.logs = logs;
        });

        it('burns the requested amount', async function() {
          (await tokenContract.balanceOf(owner)).should.be.bignumber.equal(
            initialBalance.sub(amount)
          );
        });

        it('decrements allowance', async function() {
          (await tokenContract.allowance(owner, burner)).should.be.bignumber.equal(
            originalAllowance.sub(amount)
          );
        });

        it('emits a transfer event', async function() {
          expectEvent.inLogs(this.logs, 'Transfer', {
            from: owner,
            to: ZERO_ADDRESS,
            value: amount
          });
        });
      }
    });

    describe('when the given amount is greater than the balance of the sender', function() {
      const amount = initialBalance.addn(1);

      it('reverts', async function() {
        await tokenContract.approve(burner, amount, {from: owner});
        await shouldFail.reverting(tokenContract.burnFrom(owner, amount, {from: burner}));
      });
    });

    describe('when the given amount is greater than the allowance', function() {
      const allowance = new BN(100);

      it('reverts', async function() {
        await tokenContract.approve(burner, allowance, {from: owner});
        await shouldFail.reverting(
          tokenContract.burnFrom(owner, allowance.addn(1), {from: burner})
        );
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC20Burnable
};
