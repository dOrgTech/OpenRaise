// Import all required modules from openzeppelin-test-helpers
const {
    BN,
    constants,
    expectEvent,
    expectRevert
  } = require("openzeppelin-test-helpers");
  
  // Import preferred chai flavor: both expect and should are supported
  const expect = require("chai").expect;
  const should = require("chai").should();
  const lib = require("zos-lib");
  
  const {
    appCreate,
    getAppAddress,
    encodeCall,
    getZosConfig,
    getCurrentZosNetworkConfig
  } = require("../testHelpers");
  
  const PaymentToken = artifacts.require("StandaloneERC20");
  const ClaimsToken = artifacts.require("ClaimsToken");
  const BondingCurve = artifacts.require("BondingCurve");
  const BancorCurveLogic = artifacts.require("BancorCurveLogic");
  const App = artifacts.require("App");
  
  contract("ClaimsToken", ([sender, receiver]) => {
    let tx;
  
    let values = {
      paymentToken: {
        name: "PaymentToken",
        symbol: "PAY",
        decimals: new BN(18)
      },
      claimsToken: {
        name: "BondedToken",
        symbol: "BND",
        decimals: new BN(18),
        controller: sender,
        paymentToken: null,
        transfersEnabled: true
      }
    };
  
    const appAddress = getAppAddress();
  
    beforeEach(async function() {
      this.app = await App.at(appAddress);
    
      const curveAddress = await appCreate(
        "bc-dao",
        "BancorCurveLogic",
        receiver,
        encodeCall("initialize", ["uint32"], [1000])
      );
  
      this.curve = await BancorCurveLogic.at(curveAddress);
  
    it("should have properly initialized values", async function() {
      expect(await this.claimsToken.name()).to.be.equal(values.claimsToken.name);
  
      expect(await this.claimsToken.symbol()).to.be.equal(
        values.claimsToken.symbol
      );
  
      expect(await this.claimsToken.decimals()).to.be.bignumber.equal(
        values.claimsToken.decimals
      );
  
      expect(await this.claimsToken.owner()).to.be.equal(
        values.claimsToken.controller
      );
  
      expect(await this.claimsToken.transfersEnabled()).to.be.equal(
        values.claimsToken.transfersEnabled
      );
    });
  });
  