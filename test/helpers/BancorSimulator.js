const Decimal = require('decimal.js');
const MAX_RATIO = new Decimal(1000000);
const ONE = new Decimal(1);

function calculatePurchaseReturn(supply, balance, ratio, amount) {
  // Decimal(supply)*((1+Decimal(amount)/Decimal(balance))**(Decimal(ratio)/1000000)-1)

  supply = new Decimal(supply.toString());
  balance = new Decimal(balance.toString());
  ratio = new Decimal(ratio.toString());
  amount = new Decimal(amount.toString());

  return supply
    .mul(
      ONE.plus(amount.div(balance))
        .pow(ratio.div(MAX_RATIO))
        .sub(ONE)
    )
    .toDecimalPlaces(0)
    .toString();
}

function calculateSaleReturn(supply, balance, ratio, amount) {
  // Decimal(balance) * (1 - (1 - Decimal(amount) / Decimal(supply)) ** (1000000 / Decimal(ratio)))

  supply = new Decimal(supply.toString());
  balance = new Decimal(balance.toString());
  ratio = new Decimal(ratio.toString());
  amount = new Decimal(amount.toString());

  return balance
    .mul(ONE.sub(ONE.sub(amount.div(supply)).pow(MAX_RATIO.div(ratio))))
    .toDecimalPlaces(0)
    .toString();
}

module.exports = {
  calculatePurchaseReturn,
  calculateSaleReturn
};
