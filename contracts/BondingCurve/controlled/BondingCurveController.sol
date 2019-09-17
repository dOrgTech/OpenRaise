pragma solidity ^0.5.7;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "@openzeppelin/upgrades/contracts/application/App.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "./BondingCurveControlled.sol";
import "./BondingCurveControlledFactory.sol";
import "../curve/BancorCurveLogic.sol";
import "../curve/BancorCurveService.sol";
import "../curve/StaticCurveLogic.sol";
import "../dividend/RewardsDistributor.sol";
import "../token/BondedToken.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Combined Factory
 * @dev Allows for the deploy of a Bonding Curve and supporting components in a single transaction
 * This was developed to simplify the deployment process for DAOs
 */
contract BondingCurveController is Initializable {
    /* 
        Bonding Curve Public
    */

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens. If zero, any price is allowed.
    /// @param recipient    Address to send the new bondedTokens to
    function buy(
        BondingCurveControlled bondingCurve,
        uint256 numTokens,
        uint256 maxPrice,
        address recipient
    ) public {
        bondingCurve.buy(msg.sender, numTokens, maxPrice, recipient);
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send collateralTokens to
    function sell(
        BondingCurveControlled bondingCurve,
        uint256 numTokens,
        uint256 minPrice,
        address recipient
    ) public {
        bondingCurve.sell(msg.sender, numTokens, minPrice, recipient);
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(BondingCurveControlled bondingCurve, uint256 amount) public {
        bondingCurve.pay(msg.sender, amount);
    }

    /* 
        Bonding Curve Admin
    */

    /// @notice Set beneficiary to a new address
    /// @param beneficiary       New beneficiary
    function setBeneficiary(BondingCurveControlled bondingCurve, address beneficiary) public {
        bondingCurve.setBeneficiary(msg.sender, beneficiary);
    }

    /// @notice Set buy curve to a new address
    /// @param buyCurve       New buy curve
    function setBuyCurve(BondingCurveControlled bondingCurve, ICurveLogic buyCurve) public {
        bondingCurve.setBuyCurve(msg.sender, buyCurve);
    }

    /// @notice Set sell curve to a new address
    /// @param sellCurve       New sell curve
    function setSellCurve(BondingCurveControlled bondingCurve, ICurveLogic sellCurve) public {
        bondingCurve.setSellCurve(msg.sender, sellCurve);
    }

    /// @notice Set split on pay to new value
    /// @param splitOnPay       New split on pay value
    function setSplitOnPay(BondingCurveControlled bondingCurve, uint256 splitOnPay) public {
        bondingCurve.setSplitOnPay(msg.sender, splitOnPay);
    }

}
