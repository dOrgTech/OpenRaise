pragma solidity >= 0.4.22 <6.0.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Static Curve Logic
 * @dev Curve that always returns the same price
 * This implementation is primarily for testing, though it could be used in production
 * A potential use-case is zero-ing out the sell curve, which coupled with no split
 * on buy sends raised funds directly to the beneficiary
 */

contract StaticCurveLogic is Initializable, ICurveLogic {
    using SafeMath for uint256;

    /**
        Ranges from 0 to 1^18. Divide by Precision to determine ratio.
     */
    uint256 internal _tokenRatio;
    uint256 internal constant PRECISION = 1000000;

    function initialize(uint256 tokenRatio) public initializer {
        _tokenRatio = tokenRatio;
    }

    function calcMintPrice(
        uint256 totalSupply,
        uint256 reserveBalance,
        uint256 amount
    ) public view returns (uint256) {
        return amount.mul(_tokenRatio).div(PRECISION);
    }
    
    function calcBurnReward(
        uint256 totalSupply,
        uint256 reserveBalance,
        uint256 amount
    ) public view returns (uint256) {
        return amount.mul(_tokenRatio).div(PRECISION);
        
    }

    function tokenRatio() public view returns (uint256) {
        return _tokenRatio;
    }

    function getPricePrecision() public view returns (uint) {
        return PRECISION;
    }
}
