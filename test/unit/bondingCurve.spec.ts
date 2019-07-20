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
const BondedToken = artifacts.require('BondedToken');
const BondingCurve = artifacts.require('BondingCurve');
const DividendPool = artifacts.require('DividendPool');
const StaticCurveLogic = artifacts.require('StaticCurveLogic');
const App = artifacts.require('App');

/*
  Uses StaticCurveLogic for simpler tests.
*/

contract('Bonding Curve', accounts => {
  let tx;
  let result;

  let paymentToken;
  let dividendPool;
  let bondedToken;
  let bondingCurve;
  let buyCurve;
  let sellCurve;

  const sender = accounts[0];

  const buyTokenRatio = new BN(100000000); //1 bondedToken minted for every 100 collateralTokens sent
  const sellTokenRatio = new BN(10000000); //10 collateralTokens returned for every bondedToken burned
  const tokenRatioPrecision = new BN(1000000);

  const splitOnPayPrecision = new BN(10000);
  const splitOnPayRatio = new BN(500000);

  let values = {
    paymentToken: {
      name: 'PaymentToken',
      symbol: 'PAY',
      decimals: new BN(18)
    },
    bondedToken: {
      name: 'BondedToken',
      symbol: 'BND',
      decimals: new BN(18)
    }
  };

  beforeEach(async function() {
    //Initial supply starts with sender who can also mint
    paymentToken = await PaymentToken.new();
    paymentToken.initialize(
      values.paymentToken.name,
      values.paymentToken.symbol,
      values.paymentToken.decimals,
      1000000,
      accounts[0],
      [accounts[0]],
      [accounts[0]]
    );

    const dividendPoolAddress = await appCreate(
      'bc-dao',
      'DividendPool',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['address', 'address'], [paymentToken.address, accounts[0]])
    );

    dividendPool = await DividendPool.at(dividendPoolAddress);

    const bondedTokenAddress = await appCreate(
      'bc-dao',
      'BondedToken',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['string', 'string', 'uint8', 'address'],
        [
          values.bondedToken.name,
          values.bondedToken.symbol,
          values.bondedToken.decimals.toNumber(),
          accounts[0]
        ]
      )
    );

    bondedToken = await BondedToken.at(bondedTokenAddress);

    const buyCurveAddress = await appCreate(
      'bc-dao',
      'StaticCurveLogic',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['uint256'], [buyTokenRatio.toString()])
    );

    buyCurve = await StaticCurveLogic.at(buyCurveAddress);

    const sellCurveAddress = await appCreate(
      'bc-dao',
      'StaticCurveLogic',
      constants.ZERO_ADDRESS,
      encodeCall('initialize', ['uint256'], [sellTokenRatio.toString()])
    );

    sellCurve = await StaticCurveLogic.at(sellCurveAddress);

    const bondingCurveAddress = await appCreate(
      'bc-dao',
      'BondingCurve',
      constants.ZERO_ADDRESS,
      encodeCall(
        'initialize',
        ['address', 'address', 'address', 'address', 'address', 'address', 'address', 'uint256'],
        [
          accounts[0],
          accounts[0],
          paymentToken.address,
          bondedToken.address,
          buyCurve.address,
          sellCurve.address,
          dividendPool.address,
          splitOnPayRatio.toString()
        ]
      )
    );

    bondingCurve = await BondingCurve.at(bondingCurveAddress);
  });

  it('should have properly initialized parameters', async function() {
    expect(await bondingCurve.owner()).to.be.equal(sender);
    expect(await bondingCurve.beneficiary()).to.be.equal(sender);
    expect(await bondingCurve.collateralToken()).to.be.equal(paymentToken.address);
    expect(await bondingCurve.bondedToken()).to.be.equal(bondedToken.address);
    expect(await bondingCurve.buyCurve()).to.be.equal(buyCurve.address);
    expect(await bondingCurve.sellCurve()).to.be.equal(sellCurve.address);
    expect(await bondingCurve.dividendPool()).to.be.equal(dividendPool.address);
    expect(await bondingCurve.splitOnPay()).to.be.bignumber.equal(splitOnPayRatio);
  });

  it('should allow owner to set new beneficiary', async function() {
    tx = await bondingCurve.setBeneficiary(accounts[2], {from: sender});
    expect(await bondingCurve.beneficiary()).to.be.equal(accounts[2]);
  });

  it('should not allow non-owner to set new beneficiary', async function() {
    await expectRevert.unspecified(
      bondingCurve.setBeneficiary(constants.ZERO_ADDRESS, {
        from: accounts[2]
      })
    );
  });

  it('should allow owner to set new owner', async function() {
    const oldOwner = sender;
    const newOwner = accounts[2];

    tx = await bondingCurve.transferOwnership(newOwner, {from: oldOwner});
    expect(await bondingCurve.owner()).to.be.equal(newOwner);
  });

  it('should not allow non-owner to set new owner', async function() {
    const nonOwner = accounts[1];
    const newOwner = accounts[2];

    await expectRevert.unspecified(
      bondingCurve.transferOwnership(newOwner, {
        from: nonOwner
      })
    );
  });

  it('should correctly return splitOnPay precision (for external calculations)', async function() {
    const expected = splitOnPayPrecision;
    result = await bondingCurve.splitOnPayPrecision();
    expect(result).to.be.bignumber.equal(expected);
  });

  it('should not allow old owner to set new beneficiary after transfer', async function() {
    const oldOwner = accounts[0];
    const oldBeneficiary = accounts[0];
    const newOwner = accounts[2];
    const newBeneficiary = accounts[3];

    tx = await bondingCurve.transferOwnership(newOwner, {from: oldOwner});

    result = await bondingCurve.beneficiary();
    expect(result).to.be.equal(oldBeneficiary);

    await bondingCurve.setBeneficiary(newBeneficiary, {from: newOwner});

    result = await bondingCurve.beneficiary();
    expect(result).to.be.equal(newBeneficiary);
  });

  it('should not allow to buy with 0 tokens specified', async function() {
    const buyer = accounts[2];
    await expectRevert.unspecified(bondingCurve.buy(0, 100, buyer, {from: buyer}));
  });

  it('should show buy price correctly', async function() {
    const numTokens = new BN(100);
    const expected = numTokens.mul(buyTokenRatio).div(tokenRatioPrecision);

    result = await bondingCurve.priceToBuy(numTokens);

    expect(result).to.be.bignumber.equal(expected);
  });

  it('should show sell reward correctly', async function() {
    const numTokens = new BN(100);
    const expected = numTokens.mul(sellTokenRatio).div(tokenRatioPrecision);

    result = await bondingCurve.rewardForSell(numTokens);

    expect(result).to.be.bignumber.equal(expected);
  });

  it('should not allow to sell with 0 tokens specified', async function() {
    const buyer = accounts[2];
    await expectRevert.unspecified(bondingCurve.sell(0, 100, buyer, {from: buyer}));
  });

  it('should allow user with collateralTokens approved to buy bondedTokens', async function() {
    const buyer = accounts[2];
    const approvalAmount = new BN(web3.utils.toWei('1', 'ether'));
    console.log('approvalAmount', approvalAmount.toString());
    const numTokens = new BN(100);

    result = await bondingCurve.priceToBuy(numTokens);
    console.log('buy', result.toString());
    result = await bondingCurve.rewardForSell(numTokens);
    console.log('sell', result.toString());

    // Mint tokens to buyer
    await paymentToken.approve(bondingCurve.address, approvalAmount, {
      from: buyer
    });
    tx = await bondingCurve.buy(numTokens, 0, buyer, {from: buyer});

    // //Verify events
    // expectEvent.inLogs(tx.logs, 'Buy', {
    //   buyer: buyer,
    //   recipient: buyer,
    //   amount: numTokens
    // });

    // //Check balance
    result = await bondedToken.balanceOf(buyer);
    expect(result).to.be.bignumber.equal(numTokens);
  });
  it('should not allow user without collateralTokens approved to buy bondedTokens', async function() {
    const buyer = accounts[2];
    const numTokens = new BN(100);

    // Mint tokens to buyer
    await expectRevert.unspecified(bondingCurve.buy(numTokens, 0, buyer, {from: buyer}));
  });

  it('should allow user with bondedTokens to sell', async function() {
    const buyer = accounts[2];
    const approvalAmount = new BN(web3.utils.toWei('60000', 'ether'));
    const numTokens = new BN(100);

    // Mint tokens to buyer
    await paymentToken.approve(bondingCurve.address, approvalAmount, {
      from: buyer
    });
    await bondingCurve.buy(numTokens, 0, buyer, {from: buyer});

    await bondingCurve.sell(numTokens, 0, buyer, {from: buyer});
  });

  it('should not allow user without bondedTokens to sell', async function() {
    const seller = accounts[2];
    const numTokens = new BN(100);

    await expectRevert.unspecified(bondingCurve.sell(numTokens, 0, seller, {from: seller}));
  });

  it('should not allow bondingCurve owner to mint bondedTokens', async function() {
    await expectRevert.unspecified(bondedToken.mint(accounts[0], 100, {from: accounts[0]}));
  });
  it('should not allow other addresses to mint bondedTokens', async function() {
    await expectRevert.unspecified(bondedToken.mint(accounts[0], 100, {from: accounts[2]}));
  });

  it('should not allow to buy if sell curve value is higher than buy curve value', async function() {});
  it('should not fail with div / 0 errors', async function() {});

  it('should not allow buy if current price exceeds specified max price', async function() {});
  it('should not allow sell if current price is lower than specified min price', async function() {});

  describe('Payments', async () => {
    const owner = accounts[0];
    const paymentAmount = new BN(10000);

    beforeEach(async () => {
      console.log(paymentToken.address);
      await paymentToken.approve(bondingCurve.address, 10000, {from: owner});
    });
    it('should not allow payments of amount 0', async function() {
      await expectRevert.unspecified(bondingCurve.pay(0, {from: owner}));
    });
    it('should register payments', async function() {
      await bondingCurve.pay(1000, {from: owner});
    });
    it('should transfer tokens to beneficiary and dividend pool according to splitOnPay', async function() {});
    it('should transfer all tokens to beneficiary when splitOnPay is 0%', async function() {});
    it('should transfer all tokens to dividend pool when splitOnPay is 100%', async function() {});
    it('should not allow pay without successful token transfer from sender', async function() {});
  });
});
