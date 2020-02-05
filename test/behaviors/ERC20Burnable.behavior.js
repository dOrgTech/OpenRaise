const {BN, constants, expectEvent, shouldFail} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

function shouldBehaveLikeERC20Burnable(tokenContract, owner, initialBalance, [burner]) {
  describe('burn', () => {
    describe('when the given amount is not greater than balance of the sender', () => {
      context('for a zero amount', () => {
        shouldBurn(new BN(0));
      });

      context('for a non-zero amount', () => {
        shouldBurn(new BN(100));
      });

      function shouldBurn(amount) {
        beforeEach(async () => {
          ({logs: this.logs} = await tokenContract.burn(amount, {
            from: owner
          }));
        });

        it('burns the requested amount', async () => {
          (await tokenContract.balanceOf(owner)).should.be.bignumber.equal(
            initialBalance.sub(amount)
          );
        });

        it('emits a transfer event', async () => {
          expectEvent.inLogs(this.logs, 'Transfer', {
            from: owner,
            to: ZERO_ADDRESS,
            value: amount
          });
        });
      }
    });

    describe('when the given amount is greater than the balance of the sender', () => {
      const amount = initialBalance.addn(1);

      it('reverts', async () => {
        await shouldFail.reverting(tokenContract.burn(amount, {from: owner}));
      });
    });
  });

  describe('burnFrom', () => {
    describe('on success', () => {
      context('for a zero amount', () => {
        shouldBurnFrom(new BN(0));
      });

      context('for a non-zero amount', () => {
        shouldBurnFrom(new BN(100));
      });

      function shouldBurnFrom(amount) {
        const originalAllowance = amount.muln(3);

        beforeEach(async () => {
          await tokenContract.approve(burner, originalAllowance, {
            from: owner
          });
          const {logs} = await tokenContract.burnFrom(owner, amount, {
            from: burner
          });
          this.logs = logs;
        });

        it('burns the requested amount', async () => {
          (await tokenContract.balanceOf(owner)).should.be.bignumber.equal(
            initialBalance.sub(amount)
          );
        });

        it('decrements allowance', async () => {
          (await tokenContract.allowance(owner, burner)).should.be.bignumber.equal(
            originalAllowance.sub(amount)
          );
        });

        it('emits a transfer event', async () => {
          expectEvent.inLogs(this.logs, 'Transfer', {
            from: owner,
            to: ZERO_ADDRESS,
            value: amount
          });
        });
      }
    });

    describe('when the given amount is greater than the balance of the sender', () => {
      const amount = initialBalance.addn(1);

      it('reverts', async () => {
        await tokenContract.approve(burner, amount, {from: owner});
        await shouldFail.reverting(tokenContract.burnFrom(owner, amount, {from: burner}));
      });
    });

    describe('when the given amount is greater than the allowance', () => {
      const allowance = new BN(100);

      it('reverts', async () => {
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
