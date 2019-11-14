pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/BondingCurveBase.sol";
import "contracts/BondingCurve/interface/IBondingCurve.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurveEth is Initializable, BondingCurveBase {
    using SafeMath for uint256;

    string internal constant INSUFFICENT_ETHER = "Insufficent Ether";
    string internal constant INCORRECT_ETHER = "Incorrect Ether value sent";
    string internal constant MATH_ERROR_SPLITTING_COLLATERAL = "Calculated Split Invalid";

    /// @dev Initialize contract
    /// @param owner Contract owner, can conduct administrative functions.
    /// @param beneficiary Recieves a proportion of incoming tokens on buy() and pay() operations.
    /// @param bondedToken Token native to the curve. The bondingCurve contract has exclusive rights to mint and burn tokens.
    /// @param buyCurve Curve logic for buy curve.
    /// @param reservePercentage Percentage of incoming collateralTokens distributed to beneficiary on buys. (The remainder is sent to reserve for sells)
    /// @param dividendPercentage Percentage of incoming collateralTokens distributed to beneficiary on payments. The remainder being distributed among current bondedToken holders. Divided by precision value.
    function initialize(
        address owner,
        address beneficiary,
        BondedToken bondedToken,
        ICurveLogic buyCurve,
        uint256 reservePercentage,
        uint256 dividendPercentage
    ) public initializer {
        BondingCurveBase.initialize(
            owner,
            beneficiary,
            bondedToken,
            buyCurve,
            reservePercentage,
            dividendPercentage
        );
    }

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param etherToSpend Amount of Ether to spend
    /// @param maxPrice    Minimum allowable bondedTokens to recieve. If 0, any amount is acceptable.
    /// @param recipient    Address to send the new bondedTokens to
    function buy(uint256 etherToSpend, uint256 maxPrice, address recipient) public payable whenNotPaused {
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param amount    The number of bondedTokens to sell
    /// @param minReturn     Minimum total Ether to receive
    /// @param recipient    Address to send collateralTokens to
    function sell(uint256 amount, uint256 minReturn, address recipient) public whenNotPaused {
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
    }

    // // Interpret fallback as payment
    // function () public payable {
    //     pay(msg.value);
    // }
}
