pragma solidity >= 0.4.22 <6.0.0;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/ICurveLogic.sol";
import "./bancor-formula/BancorFormula.sol";

/**
 * @title Bancor Curve Logic
 * @dev Curve that returns price according to bancor formula and specified reserve ration
 */
contract BancorCurveLogic is Initializable, BancorFormula, ICurveLogic {
    using SafeMath for uint256;

    /*
    * @dev reserve ratio, represented in ppm, 1-1000000
    * 1/3 corresponds to y= multiple * x^2
    * 1/2 corresponds to y= multiple * x
    * 2/3 corresponds to y= multiple * x^1/2
    * multiple will depends on contract initialization,
    * specificallytotalAmount and poolBalance parameters
    * we might want to add an 'initialize' function that will allow
    * the owner to send ether to the contract and mint a given amount of tokens
    */
    
    uint32 internal _reserveRatio;

    function initialize(uint32 reserveRatio) public initializer {
        _reserveRatio = reserveRatio;
        BancorFormula.initialize();
    }

    function calcMintPrice(
        uint256 totalSupply,
        uint256 reserveBalance,
        uint256 amount
    ) public view returns (uint256) {
        return calculatePurchaseReturn(totalSupply, reserveBalance, _reserveRatio, amount);
    }
    
    function calcBurnReward(
        uint256 totalSupply,
        uint256 reserveBalance,
        uint256 amount
    ) public view returns (uint256) {
        return calculateSaleReturn(totalSupply, reserveBalance, _reserveRatio, amount);
    }

    function reserveRatio() public returns (uint32) {
        return _reserveRatio;
    }
}
