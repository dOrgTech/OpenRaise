const { BN } = require("openzeppelin-test-helpers");

module.exports.paymentTokenValues = {
  parameters: {
    name: "PaymentToken",
    symbol: "Pay",
    decimals: 18,
    initialSupply: 1000000000
  }
};

module.exports.bondedTokenValues = {
  parameters: {
    name: "BondedToken",
    symbol: "BND",
    decimals: 18
  }
};
