pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/interface/ICurveLogic.sol";

/// @title  PolynomialCurvedToken - A polynomial bonding curve
///         implementation that is backed by an EIP20 token.
contract PolynomialCurveLogic is Initializable, ICurveLogic {
    using SafeMath for uint256;

    uint256 private constant PRECISION = 10000000000;
    uint8 public exponent;

    /// @dev constructor        Initializes the bonding curve
    /// @param _exponent        The exponent of the curve
    function initialize(uint8 _exponent) public initializer {
        exponent = _exponent;
    }

    /// @dev        Calculate the integral from 0 to t
    /// @param t    The number to integrate to
    function curveIntegral(uint256 t) internal view returns (uint256) {
        uint256 nexp = exponent + 1;
        // Calculate integral of t^exponent
        return PRECISION.div(nexp).mul(t ** nexp).div(PRECISION);
    }

    function calcMintPrice(uint256 totalSupply, uint256 reserveBalance, uint256 amount)
        public
        view
        returns (uint256)
    {
        return curveIntegral(totalSupply.add(amount)).sub(reserveBalance);
    }

    function calcBurnReward(uint256 totalSupply, uint256 reserveBalance, uint256 amount)
        public
        view
        returns (uint256)
    {
        return reserveBalance.sub(curveIntegral(totalSupply.sub(amount)));
    }
}
