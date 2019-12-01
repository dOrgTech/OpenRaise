// // Import all required modules from openzeppelin-test-helpers
// const {
//   BN,
//   constants,
//   expectEvent,
//   expectRevert
// } = require("openzeppelin-test-helpers");

// // Import preferred chai flavor: both expect and should are supported
// const expect = require("chai").expect;
// const should = require("chai").should();

// require("../setup");
// const { deployProject, deployBondedToken } = require("../../index.js");

// const { bondedTokenValues } = require("../constants/tokenValues");
// const {
//   shouldBehaveLikeERC20Burnable
// } = require("../behaviors/ERC20Burnable.behavior");

// contract("BondedToken", accounts => {
//   let tx;
//   let result;
//   let project;
//   let bondedToken;

//   const creator = accounts[0];
//   const initializer = accounts[1];
//   const otherAccounts = accounts.slice(2, accounts.length);

//   beforeEach(async function() {
//     project = await deployProject();
//     bondedToken = await deployBondedToken(project, [
//       bondedTokenValues.parameters.name,
//       bondedTokenValues.parameters.symbol,
//       bondedTokenValues.parameters.decimals,
//       initializer
//     ]);
//     console.log(bondedToken.address);
//     const initialBalance = new BN(10000);
//     await bondedToken.methods
//       .mint(initializer, initialBalance.toString())
//       .send({ from: initializer });
//   });

//   it("sets parameters correctly", async function() {});

//   describe("Burn", async function() {
//     const initialBalance = new BN(10000);
//     await bondedToken.methods
//       .mint(initializer, initialBalance.toString())
//       .send({ from: initializer });

//     it("sets initial balance correctly", async function() {
//       result = await bondedToken.methods
//         .balanceOf(initializer)
//         .call({ from: initializer });

//       expect(new BN(result)).to.be.bignumber.equal(initialBalance);
//     });

//     shouldBehaveLikeERC20Burnable(
//       bondedToken,
//       initializer,
//       initialBalance,
//       otherAccounts
//     );
//   });

//   it("allows minter to mint tokens", async function() {});
//   it("allows minter to burn tokens", async function() {});
//   it("forbids non-minter to mint tokens", async function() {});
//   it("forbids non-minter to burn tokens", async function() {});
// });
