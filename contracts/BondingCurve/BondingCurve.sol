pragma solidity ^0.5.7;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "zos-lib/contracts/Initializable.sol";
import "./interface/ICurveLogic.sol";
import "./interface/IClaimsToken.sol";
import "./dividend/DividendPaymentTracker.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurve is Initializable, Ownable, DividendPaymentTracker {
    using SafeMath for uint256;

    IERC20 public reserveToken;
    IClaimsToken public bondedToken;

    ICurveLogic public buyCurve;
    ICurveLogic public sellCurve;
    address public beneficiary;

    uint256 public reserveBalance;
    uint256 public splitOnPay;

    string internal constant TRANSFER_FROM_FAILED = "TRANSFER_FROM_FAILED";
    string internal constant INSUFFICENT_TOKENS = "INSUFFICENT_TOKENS";
    string internal constant MAX_PRICE_EXCEEDED = "MAX_PRICE_EXCEEDED";
    string internal constant PRICE_BELOW_MIN = "PRICE_BELOW_MIN";

    event BeneficiarySet(address beneficiary);

    function initialize(
        IERC20 _reserveToken,
        address _beneficiary,
        address _owner,
        ICurveLogic _buyCurve,
        ICurveLogic _sellCurve,
        IClaimsToken _bondedToken,
        uint256 _splitOnPay
    ) public initializer {
        require(_splitOnPay > 0 && _splitOnPay < 100, "splitOnPay must be a valid percentage");
        Ownable.initialize(_owner);
        DividendPaymentTracker.initialize(_bondedToken, _reserveToken);
        reserveToken = IERC20(_reserveToken);

        beneficiary = _beneficiary;
        emit BeneficiarySet(beneficiary);

        buyCurve = _buyCurve;
        sellCurve = _sellCurve;
        bondedToken = _bondedToken;

        // TODO: validate dividend ratio
        splitOnPay = _splitOnPay;
    }

    /// @notice             Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns (uint256) {
        return buyCurve.calcMintPrice(bondedToken.totalSupply(), reserveBalance, numTokens);
    }

    /// @notice             Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns (uint256) {
        return sellCurve.calcBurnReward(bondedToken.totalSupply(), reserveBalance, numTokens);
    }

    /// @notice                 Get the dividend tokens that would currently be recieved for a specified amonut of reserve currency
    /// @param reserveTokens    The number of reserve tokens to calculate result for
    // function tokensForValue(uint256 reserveTokens) public view returns(uint256) {
    //     //TODO: This requires the integral calculations
    // }

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function buy(uint256 numTokens, uint256 maxPrice, address recipient)
        public
        returns (uint256 collateralSent)
    {
        uint256 buyPrice = buyCurve.calcMintPrice(
            bondedToken.totalSupply(),
            reserveBalance,
            numTokens
        );
        require(buyPrice <= maxPrice, MAX_PRICE_EXCEEDED);

        uint256 sellPrice = sellCurve.calcMintPrice(
            bondedToken.totalSupply(),
            reserveBalance,
            numTokens
        );

        uint256 tokensToBeneficiary = buyPrice.sub(sellPrice);
        uint256 tokensToReserve = sellPrice;

        bondedToken.mint(recipient, numTokens); //TODO: Require? How does it fail?

        require(
            reserveToken.transferFrom(msg.sender, address(this), buyPrice),
            TRANSFER_FROM_FAILED
        );

        reserveBalance = reserveBalance.add(tokensToReserve);
        reserveToken.transfer(beneficiary, tokensToBeneficiary); //TODO: Handle failure case? We want it to not care if transfer fails

        return buyPrice;
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send collateralTokens to
    function sell(uint256 numTokens, uint256 minPrice, address recipient)
        public
        returns (uint256 collateralReceived)
    {
        require(bondedToken.balanceOf(msg.sender) >= numTokens, INSUFFICENT_TOKENS);

        uint256 burnReward = sellCurve.calcBurnReward(
            bondedToken.totalSupply(),
            reserveBalance,
            numTokens
        );
        require(burnReward >= minPrice, PRICE_BELOW_MIN);

        bondedToken.burn(msg.sender, numTokens);
        reserveBalance = reserveBalance.sub(burnReward);

        reserveToken.transfer(recipient, burnReward);

        return burnReward;
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
        IERC20 paymentToken = IERC20(getPaymentToken());

        uint256 tokensToBeneficiary = 0;
        uint256 tokensToDividendHolders = 0;

        require(paymentToken.transferFrom(msg.sender, address(this), amount), TRANSFER_FROM_FAILED);

        paymentToken.transfer(beneficiary, tokensToBeneficiary);
        _registerPayment(tokensToDividendHolders);
    }

    function setBeneficiary(address _beneficiary) public onlyOwner {
        beneficiary = _beneficiary;
        emit BeneficiarySet(beneficiary);
    }
}
