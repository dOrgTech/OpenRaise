pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interface/ICurveLogic.sol";

contract PolynomialCurve is ICurveLogic {
    using SafeMath for uint256;

    uint256 public PRECISION = 10**7;
    uint256 public exponent;

    string public constant EXCEEDED_MAX_EXPONENT = "0";

    constructor(uint8 _exponent) public {
        require (_exponent <= 255, EXCEEDED_MAX_EXPONENT);
        exponent = _exponent;
    }

    function _curveIntegral(uint256 _x)
        internal view
        returns (uint256)
    {
        uint256 nexp = exponent.add(1);
        return PRECISION.div(nexp).mul(_x ** nexp).div(PRECISION);
    }

    function getCurveParams() external view returns(uint256) {
        return exponent;
    }

    function calcMintPrice(
        uint256 totalSupply,
        uint256 amount
    ) public view returns (uint256) {
        return _curveIntegral(totalSupply.add(amount));
    }
    
    function calcBurnReward(
        uint256 totalSupply,
        uint256 amount
    ) public view returns (uint256) {
        return _curveIntegral(totalSupply.sub(amount));
    }
}
