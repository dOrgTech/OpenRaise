pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/BondingCurveBase.sol";
import "contracts/BondingCurve/interface/IBondingCurveERC20.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurve is Initializable, BondingCurveBase, IBondingCurveERC20 {
    using SafeMath for uint256;

    IERC20 internal _collateralToken;

    /// @dev Initialize contract
    /// @param owner Contract owner, can conduct administrative functions.
    /// @param beneficiary Recieves a proportion of incoming tokens on buy() and pay() operations.
    /// @param collateralToken Token accepted as collateral by the curve. (e.g. WETH or DAI)
    /// @param bondedToken Token native to the curve. The bondingCurve contract has exclusive rights to mint and burn tokens.
    /// @param buyCurve Curve logic for buy curve.
    /// @param reservePercentage Percentage of incoming collateralTokens distributed to beneficiary on buys. (The remainder is sent to reserve for sells)
    /// @param dividendPercentage Percentage of incoming collateralTokens distributed to beneficiary on payments. The remainder being distributed among current bondedToken holders. Divided by precision value.
    function initialize(
        address owner,
        address beneficiary,
        IERC20 collateralToken,
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
        _collateralToken = collateralToken;
    }

    function buy(uint256 amount, uint256 maxPrice, address recipient)
        public
        whenNotPaused
        returns (uint256 collateralSent)
    {
        (uint256 buyPrice, uint256 toReserve, uint256 toBeneficiary) = _preBuy(amount, maxPrice);

        require(
            _collateralToken.transferFrom(msg.sender, address(this), buyPrice),
            TRANSFER_FROM_FAILED
        );
        _collateralToken.transfer(_beneficiary, toBeneficiary);

        _postBuy(msg.sender, recipient, amount, buyPrice, toReserve, toBeneficiary);
        return buyPrice;
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param amount       The number of bondedTokens to sell
    /// @param minReturn    Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function sell(uint256 amount, uint256 minReturn, address recipient)
        public
        whenNotPaused
        returns (uint256 collateralReceived)
    {
        uint256 burnReward = _preSell(msg.sender, amount, minReturn);

        _collateralToken.transfer(recipient, burnReward);

        _postSell(msg.sender, amount, minReturn, recipient);
        return burnReward;
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
        require(amount > MICRO_PAYMENT_THRESHOLD, NO_MICRO_PAYMENTS);

        IERC20 paymentToken = _collateralToken;

        uint256 tokensToDividendHolders = (amount.mul(_dividendPercentage)).div(MAX_PERCENTAGE);
        uint256 tokensToBeneficiary = amount.sub(tokensToDividendHolders);

        // incoming funds
        require(paymentToken.transferFrom(msg.sender, address(this), amount), TRANSFER_FROM_FAILED);

        // outgoing funds to Beneficiary
        paymentToken.transfer(_beneficiary, tokensToBeneficiary);

        // outgoing funds to token holders as dividends (stored by BondedToken)
        paymentToken.approve(address(_bondedToken), tokensToDividendHolders);
        _bondedToken.distribute(address(this), tokensToDividendHolders);

        emit Pay(
            msg.sender,
            address(paymentToken),
            amount,
            tokensToBeneficiary,
            tokensToDividendHolders
        );
    }

    /*
        Getter Functions
    */

    /// @notice Get reserve token contract
    function collateralToken() public view returns (IERC20) {
        return _collateralToken;
    }
}
