pragma solidity ^0.5.7;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "@openzeppelin/upgrades/contracts/application/App.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "./BondingCurveControlled.sol";
import "../curve/BancorCurveLogic.sol";
import "../curve/BancorCurveService.sol";
import "../curve/StaticCurveLogic.sol";
import "../dividend/DividendPool.sol";
import "../token/BondedToken.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Combined Factory
 * @dev Allows for the deploy of a Bonding Curve and supporting components in a single transaction
 * This was developed to simplify the deployment process for DAOs
 */
contract BondingCurveController is Initializable {
    event BeneficiarySet(address beneficiary);
    event BuyCurveSet(address buyCurve);
    event SellCurveSet(address sellCurve);
    event SplitOnPaySet(uint256 splitOnPay);

    event Buy(
        address indexed buyer,
        address indexed recipient,
        uint256 amount,
        uint256 price,
        uint256 reserveAmount,
        uint256 beneficiaryAmount
    );
    event Sell(address indexed seller, address indexed recipient, uint256 amount, uint256 reward);
    event Pay(
        address indexed from,
        address indexed token,
        uint256 amount,
        uint256 beneficiaryAmount,
        uint256 dividendAmount
    );

    /* 
        Bonding Curve Public
    */

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens. If zero, any price is allowed.
    /// @param recipient    Address to send the new bondedTokens to
    function buy(address curve, uint256 numTokens, uint256 maxPrice, address recipient) public {
        BondingCurveControlled bondingCurve = BondingCurveControlled(curve);
        IERC20 collateralToken = bondingCurve.collateralToken();

        uint256 buyPrice = bondingCurve.priceToBuy(numTokens);
        uint256 allowance = collateralToken.allowance(msg.sender, address(this));
        require(allowance < buyPrice, "Insufficent collateral token allowance");

        collateralToken.transferFrom(msg.sender, address(this), buyPrice);
        bondingCurve.buy(msg.sender, numTokens, maxPrice, recipient);
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send collateralTokens to
    function sell(address curve, uint256 numTokens, uint256 minPrice, address recipient) public {
        BondingCurveControlled bondingCurve = BondingCurveControlled(curve);
        BondedToken bondedToken = bondingCurve.bondedToken();

        uint256 balance = bondedToken.balanceOf(msg.sender);
        require(balance > numTokens, "Insufficent bonded tokens");

        bondedToken.transferFrom(msg.sender, address(this), numTokens);

        bondingCurve.sell(msg.sender, numTokens, minPrice, recipient);
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(address curve, uint256 amount) public {
        BondingCurveControlled bondingCurve = BondingCurveControlled(curve);
        IERC20 collateralToken = bondingCurve.collateralToken();

        uint256 allowance = collateralToken.allowance(msg.sender, address(this));
        require(allowance < amount, "Insufficent collateral token allowance");

        collateralToken.transferFrom(msg.sender, address(this), amount);

        BondingCurveControlled(curve).pay(msg.sender, amount);
    }

    /* 
        Bonding Curve Admin
    */

    /// @notice Set beneficiary to a new address
    /// @param beneficiary       New beneficiary
    function setBeneficiary(address curve, address beneficiary) public {
        BondingCurveControlled(curve).setBeneficiary(msg.sender, beneficiary);
    }

    /// @notice Set buy curve to a new address
    /// @param buyCurve       New buy curve
    function setBuyCurve(address curve, ICurveLogic buyCurve) public {
        BondingCurveControlled(curve).setBuyCurve(msg.sender, buyCurve);
    }

    /// @notice Set sell curve to a new address
    /// @param sellCurve       New sell curve
    function setSellCurve(address curve, ICurveLogic sellCurve) public {
        BondingCurveControlled(curve).setSellCurve(msg.sender, sellCurve);
    }

    /// @notice Set split on pay to new value
    /// @param splitOnPay       New split on pay value
    function setSplitOnPay(address curve, uint256 splitOnPay) public {
        BondingCurveControlled(curve).setSplitOnPay(msg.sender, splitOnPay);
    }

}
