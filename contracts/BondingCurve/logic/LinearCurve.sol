pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interface/ICurveLogic.sol";

contract LinearCurve is ICurveLogic {
    using SafeMath for uint256;

    uint256 public PRECISION = 10**7;
    uint256 public slope;
    uint256 public intercept;

    string public constant EXCEEDED_MAX_SLOPE = "EXCEEDED_MAX_SLOPE";
    string public constant EXCEEDED_MAX_INTERCEPT = "EXCEEDED_MAX_INTERCEPT";

    constructor(uint256 _slope, uint256 _intercept) public {
        require (_slope <= 255, EXCEEDED_MAX_SLOPE);
        require (_intercept <= 1000 ether, EXCEEDED_MAX_INTERCEPT);
        slope = _slope;
        intercept = _intercept;
    }

    function _priceAtSupply(uint256 supply) internal view returns (uint256) {
        return slope.mul(supply).add(intercept);
    }

    function getCurveParams() external view returns(uint256, uint256) {
        return (slope, intercept);
    }

    function calcMintPrice(
        uint256 totalSupply,
        uint256 amount
    ) public view returns (uint256) {
        uint256 startPrice = _priceAtSupply(totalSupply);
        uint256 endPrice = _priceAtSupply(totalSupply.add(amount));

        return startPrice.add(endPrice).div(2);
    }
    
    function calcBurnReward(
        uint256 totalSupply,
        uint256 amount
    ) public view returns (uint256) {
        uint256 startPrice = _priceAtSupply(totalSupply);
        uint256 endPrice = _priceAtSupply(totalSupply.sub(amount));

        return startPrice.add(endPrice).div(2);
    }
}
