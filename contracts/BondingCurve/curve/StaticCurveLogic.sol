pragma solidity >= 0.4.22 <6.0.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Static Curve Logic
 * @dev Curve that always returns the same price per token
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

    /// @dev Initialize contract
    /// @param tokenRatio Ratio of reserve tokens transfered or recieved to bonded tokens minted or burned, respectively. Divided by precison value for calculations.
    function initialize(uint256 tokenRatio) public initializer {
        _tokenRatio = tokenRatio;
    }

    /// @dev                    Get the price to mint tokens
    /// @param totalSupply      The existing number of curve tokens
    /// @param amount           The number of curve tokens to mint
    function calcMintPrice(
        uint256 totalSupply,
        uint256 reserveBalance,
        uint256 amount
    ) public view returns (uint256) {
        return amount.mul(_tokenRatio).div(PRECISION);
    }
    
    /// @dev                    Get the reward to burn tokens
    /// @param totalSupply      The existing number of curve tokens
    /// @param amount           The number of curve tokens to burn
    function calcBurnReward(
        uint256 totalSupply,
        uint256 reserveBalance,
        uint256 amount
    ) public view returns (uint256) {
        return amount.mul(_tokenRatio).div(PRECISION);
        
    }

    /// @notice Get token ratio
    function tokenRatio() public view returns (uint256) {
        return _tokenRatio;
    }

    /// @notice Get precision value used for token ratio, useful for off-chain calculations
    function tokenRatioPrecision() public view returns (uint256) {
        return PRECISION;
    }
}
