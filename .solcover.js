module.exports = {
  norpc: false,
  skipFiles: [
    "BondingCurve/curve/bancor-formula/BancorFormula.sol",
    "BondingCurve/curve/bancor-formula/Power.sol"
  ],
  copyPackages: ["openzeppelin-test-helpers"]
};
