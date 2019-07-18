// Import all required modules from openzeppelin-test-helpers
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

// Import preferred chai flavor: both expect and should are supported
const expect = require('chai').expect;
const should = require('chai').should();
const lib = require('zos-lib');

const {
  appCreate,
  getAppAddress,
  encodeCall,
  getZosConfig,
  getCurrentZosNetworkConfig
} = require('../testHelpers');

const PaymentToken = artifacts.require('StandaloneERC20');
const ClaimsToken = artifacts.require('ClaimsToken');
const BondingCurve = artifacts.require('BondingCurve');
const StaticCurveLogic = artifacts.require('StaticCurveLogic');
const App = artifacts.require('App');

/*
  Uses StaticCurveLogic for simpler tests.
*/

contract('BondingToken', accounts => {
  let tx;
  let result;

  const sender = accounts[0];
  const reciever = accounts[1];

  const buyTokenRatio = new BN(100000000); //1 bondedToken minted for every 100 reserveTokens sent
  const sellTokenRatio = new BN(10000000); //10 reserveTokens returned for every bondedToken burned

  const splitOnPayPrecision = new BN(10000);
  const splitOnPayRatio = new BN(500000);

  let values = {
    paymentToken: {
      name: 'PaymentToken',
      symbol: 'PAY',
      decimals: new BN(18)
    },
    claimsToken: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: new BN(18),
      controller: sender,
      paymentToken: null,
      transfersEnabled: true
    }
  };

  const appAddress = getAppAddress();

  beforeEach(async function() {
    this.app = await App.at(appAddress);

    this.paymentToken = await PaymentToken.new();
    this.paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals
    );

    const claimsTokenAddress = await appCreate(
      'bc-dao',
      'ClaimsToken',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['string', 'string', 'uint8', 'address', 'bool'],
        [
          values.claimsToken.name,
          values.claimsToken.symbol,
          values.claimsToken.decimals.toNumber(),
          values.claimsToken.controller,
          values.claimsToken.transfersEnabled
        ]
      )
    );

    this.claimsToken = await ClaimsToken.at(claimsTokenAddress);

    const buyCurveAddress = await appCreate(
      'bc-dao',
      'StaticCurveLogic',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['uint256'], [buyTokenRatio.toString()])
    );

    this.buyCurve = await StaticCurveLogic.at(buyCurveAddress);

    const sellCurveAddress = await appCreate(
      'bc-dao',
      'StaticCurveLogic',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['uint256'], [sellTokenRatio.toString()])
    );

    this.sellCurve = await StaticCurveLogic.at(sellCurveAddress);

    const bondingCurveAddress = await appCreate(
      'bc-dao',
      'BondingCurve',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['address', 'address', 'address', 'address', 'address', 'address', 'uint256'],
        [
          this.paymentToken.address,
          sender,
          sender,
          this.buyCurve.address,
          this.sellCurve.address,
          this.claimsToken.address,
          splitOnPayRatio.toString()
        ]
      )
    );

    this.bondingCurve = await BondingCurve.at(bondingCurveAddress);
  });

  it('should have properly initialized parameters', async function() {
    expect(await this.bondingCurve.reserveToken()).to.be.equal(this.paymentToken.address);

    expect(await this.bondingCurve.bondedToken()).to.be.equal(this.claimsToken.address);

    expect(await this.bondingCurve.buyCurve()).to.be.equal(this.buyCurve.address);

    expect(await this.bondingCurve.sellCurve()).to.be.equal(this.sellCurve.address);

    expect(await this.bondingCurve.owner()).to.be.equal(sender);

    expect(await this.bondingCurve.beneficiary()).to.be.equal(sender);

    expect(await this.bondingCurve.splitOnPay()).to.be.bignumber.equal(new BN(50));
  });

  it('should allow owner to set new beneficiary', async function() {
    tx = await this.bondingCurve.setBeneficiary(accounts[2], {from: sender});
    expect(await this.bondingCurve.beneficiary()).to.be.equal(accounts[2]);
  });

  it('should not allow non-owner to set new beneficiary', async function() {
    await expectRevert.unspecified(
      this.bondingCurve.setBeneficiary(constants.ZERO_ADDRESS, {
        from: receiver
      })
    );
  });

  it('should allow owner to set new owner', async function() {
    const oldOwner = sender;
    const newOwner = accounts[2];

    tx = await this.bondingCurve.transferOwnership(newOwner, {from: oldOwner});
    expect(await this.bondingCurve.owner()).to.be.equal(newOwner);
  });

  it('should not allow non-owner to set new owner', async function() {
    const nonOwner = accounts[1];
    const newOwner = accounts[2];

    await expectRevert.unspecified(
      this.bondingCurve.transferOwnership(newOwner, {
        from: nonOwner
      })
    );
  });

  it('should correctly return splitOnPay precision (for external calculations)', async function() {
    const expected = splitOnPayPrecision;
    result = await this.bondingCurve.getSplitOnPayPrecision();
    expect(result).to.be.bignumber.equal(expected);
  });

  it('should allow new owner to set new beneficiary after transfer', async function() {
    const oldOwner = accounts[0];
    const oldBeneficiary = accounts[0];
    const newOwner = accounts[2];
    const newBeneficiary = accounts[3];

    tx = await this.bondingCurve.transferOwnership(newOwner, {from: oldOwner});

    result = await this.bondingCurve.beneficiary();
    expect(result).to.be.equal(oldBeneficiary);

    await this.bondingCurve.setBeneficiary(newBeneficiary);

    result = await this.bondingCurve.beneficiary();
    expect(result).to.be.equal(newBeneficiary);
  });
  it('should not allow old owner to set new beneficiary after transfer', async function() {
    const oldOwner = accounts[0];
    const oldBeneficiary = accounts[0];
    const newOwner = accounts[2];
    const newBeneficiary = accounts[3];

    tx = await this.bondingCurve.transferOwnership(newOwner, {from: oldOwner});

    result = await this.bondingCurve.beneficiary();
    expect(result).to.be.equal(oldBeneficiary);

    await this.bondingCurve.setBeneficiary(newBeneficiary, {from: newOwner});

    result = await this.bondingCurve.beneficiary();
    expect(result).to.be.equal(newBeneficiary);
  });

  it('should not allow to buy with 0 tokens specified', async function() {
    const buyer = accounts[2];
    expectRevert.unspecified(await this.bondingCurve.buy(0, 100, buyer, {from: buyer}));
  });
  it('should not allow to sell with 0 tokens specified', async function() {
    const buyer = accounts[2];
    expectRevert.unspecified(await this.bondingCurve.sell(0, 100, buyer, {from: buyer}));
  });

  it('should allow user with reserveTokens approved to buy bondedTokens', async function() {
    const buyer = accounts[2];
    const approvalAmount = new BN(web3.utils.toWei('60000', 'ether'));
    const numTokens = new BN(100);

    // Mint tokens to buyer
    await this.paymentToken.approve(this.bondingCurve.address, approvalAmount, buyer, {
      from: buyer
    });
    tx = await this.bondingCurve.buy(numTokens, 0, buyer, {from: buyer});

    //Verify events
    expectEvent.inLogs(tx.logs, 'Buy', {
      buyer: buyer,
      recipient: buyer,
      amount: numTokens
    });

    //Check balance
    result = await this.bondedToken.balanceOf(buyer);
    expect(result).to.be.bignumber.equal(numTokens);
  });
  it('should now allow user without reserveTokens approved to buy bondedTokens', async function() {
    const buyer = accounts[2];
    const numTokens = new BN(100);

    // Mint tokens to buyer
    expectRevert.unspecified(await this.bondingCurve.buy(numTokens, 0, buyer, {from: buyer}));
  });

  it('should allow user with bondedTokens to sell', async function() {
    const buyer = accounts[2];
    const approvalAmount = new BN(web3.utils.toWei('60000', 'ether'));
    const numTokens = new BN(100);

    // Mint tokens to buyer
    await this.paymentToken.approve(this.bondingCurve.address, approvalAmount, buyer, {
      from: buyer
    });
    await this.bondingCurve.buy(numTokens, 0, buyer, {from: buyer});

    await this.bondingCurve.sell(numTokens, 0, buyer, {from: buyer});
  });

  it('should not allow user without bondedTokens to sell', async function() {
    const seller = accounts[2];
    const numTokens = new BN(100);

    expectRevert.unspecified(await this.bondingCurve.sell(numTokens, 0, seller, {from: seller}));
  });

  it('should now allow bondingCurve owner to mint bondedTokens', async function() {
    await this.bondedToken.mint({from: accounts[0]});
  });
  it('should now allow other addresses to mint bondedTokens', async function() {
    await this.bondedToken.mint({from: accounts[2]});
  });

  it('should not allow to buy if sell curve value is higher than buy curve value', async function() {});
  it('should not fail with div / 0 errors', async function() {});

  it('should not allow buy if current price exceeds specified max price', async function() {});
  it('should not allow sell if current price is lower than specified min price', async function() {});

  it('should not allow payments of amount 0', async function() {});
  it('should successfully transfer tokens to beneficiary and dividend pool according to splitOnPay', async function() {
    const splits = [50, 25, 40, 1, 90];

    for (let split of splits) {
      await this.bondingCurve.pay(10000);
      expect(this);
    }
  });
  it('should successfully transfer all tokens to beneficiary when splitOnPay is 0%', async function() {});
  it('should successfully transfer all tokens to dividend pool when splitOnPay is 100%', async function() {});
  it('should not allow pay without successful token transfer from sender', async function() {});
});
