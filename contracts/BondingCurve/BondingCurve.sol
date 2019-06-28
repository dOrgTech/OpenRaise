pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./utils/Beneficiary.sol";
import "./interface/ICurveLogic.sol";
import "./dividend/DividendToken.sol";
import "./dividend/DividendPaymentTracker.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens. 
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurve is Beneficiary, DividendPaymentTracker {
    using SafeMath for uint256;

    ERC20 public reserveToken;
    DividendToken public bondedToken;

    struct PaymentTokens {
        mapping (address => bool) isPaymentToken;
        address[] tokenList;
    }

    ICurveLogic public buyCurve;
    ICurveLogic public sellCurve;
    address payable beneficiary;

    uint256 public reserveBalance;
    uint256 public splitOnPay;

    string constant internal TRANSFER_FROM_FAILED = "TRANSFER_FROM_FAILED";
    string constant internal INSUFFICENT_TOKENS = "INSUFFICENT_TOKENS";
    string constant internal MAX_PRICE_EXCEEDED = "MAX_PRICE_EXCEEDED";
    string constant internal PRICE_BELOW_MIN = "PRICE_BELOW_MIN";

    constructor(
        ERC20 _reserveToken,
        address payable _beneficiary,
        ICurveLogic _buyCurve,
        ICurveLogic _sellCurve,
        DividendToken _bondedToken,
        uint256 _splitOnPay
    ) public DividendPaymentTracker(_bondedToken, _reserveToken) {
        reserveToken = _reserveToken;
        beneficiary = _beneficiary;

        buyCurve = _buyCurve;
        sellCurve = _sellCurve;

        // TODO: validate dividend ratio
        bondedToken = _bondedToken;
        splitOnPay = _splitOnPay;
    }
    
    /// @notice             Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns(uint256) {
        return buyCurve.calcMintPrice(bondedToken.totalSupply(), reserveBalance, numTokens);
    }

    /// @notice             Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns(uint256) {
        return sellCurve.calcBurnReward(bondedToken.totalSupply(), reserveBalance, numTokens);
    }

    /// @notice                 Get the dividend tokens that would currently be recieved for a specified amonut of reserve currency
    /// @param reserveTokens    The number of reserve tokens to calculate result for
    // function tokensForValue(uint256 reserveTokens) public view returns(uint256) {
    //     //TODO: This requires the integral calculations
    // }
    
    /// @notice                 Get the addresses of tokens accepted by the DAO as payment
    function getAcceptedPaymentTokens() public view returns (address[] memory) {
        address[] memory paymentTokens = new address[](1);
        paymentTokens[0] = bondedToken.getPaymentToken();
        
        return paymentTokens;
    }

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function buy(
        uint256 numTokens,
        uint256 maxPrice,
        address recipient
    ) public returns(uint256 collateralSent) {
        uint256 buyPrice = buyCurve.calcMintPrice(bondedToken.totalSupply(), reserveBalance, numTokens);
        require(buyPrice <= maxPrice, MAX_PRICE_EXCEEDED);

        uint256 sellPrice = sellCurve.calcMintPrice(bondedToken.totalSupply(), reserveBalance, numTokens);
        
        uint256 tokensToBeneficiary = buyPrice.sub(sellPrice);
        uint256 tokensToReserve = sellPrice;
        
        bondedToken.mint(recipient, numTokens); //TODO: Require? How does it fail?
                
        require(reserveToken.transferFrom(msg.sender, address(this), buyPrice), TRANSFER_FROM_FAILED);
        
        reserveBalance = reserveBalance.add(tokensToReserve);
        reserveToken.transfer(beneficiary, tokensToBeneficiary); //TODO: Handle failure case? We want it to not care if transfer fails

        return buyPrice;
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send collateralTokens to
    function sell(
        uint256 numTokens,
        uint256 minPrice,
        address recipient
    ) public returns(uint256 collateralReceived) {
        require(bondedToken.balanceOf(msg.sender) >= numTokens, INSUFFICENT_TOKENS);
        
        uint256 burnReward = sellCurve.calcBurnReward(bondedToken.totalSupply(), reserveBalance, numTokens);
        require(burnReward >= minPrice, PRICE_BELOW_MIN);

        bondedToken.burn(msg.sender, numTokens);

        reserveToken.transfer(recipient, burnReward);
        reserveBalance = reserveBalance.sub(burnReward);

        return burnReward;
    }
    
    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
        ERC20 paymentToken = ERC20(getPaymentToken());
        
        uint256 tokensToBeneficiary = 0;
        uint256 tokensToDividendHolders = 0;

        require(paymentToken.transferFrom(msg.sender, address(this), amount), TRANSFER_FROM_FAILED);
        
        paymentToken.transfer(beneficiary, tokensToBeneficiary);
        _registerPayment(tokensToDividendHolders);
    }
}
