pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Initializable.sol";
import "../Beneficiary.sol";
import "../interface/ICurveLogic.sol";
import "../dividend-token/DividendToken.sol";
import "../dividend-token/DividendPaymentTracker.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens. 
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurve is Beneficiary, DividendPaymentTracker {

    event Mint(uint256 amount, uint256 totalCost);
    event Burn(uint256 amount, uint256 reward);
    event TokenRevenue(address indexed tokenAddress, uint256 amount, uint256 beneficiaryDistribution, uint256 buybackDistribution);

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

    uint256 public buybackReserve;
    uint256 public dividendRatio;

    string constant internal TRANSFER_FROM_FAILED = "TRANSFER_FROM_FAILED";
    string constant internal INSUFFICENT_TOKENS = "INSUFFICENT_TOKENS";

    constructor(
        ERC20 _reserveToken,
        address payable _beneficiary,
        ICurveLogic _buyCurve,
        ICurveLogic _sellCurve,
        DividendToken _bondedToken,
        uint256 _dividendRatio
    ) public DividendPaymentTracker(_bondedToken, _reserveToken) {
        reserveToken = _reserveToken;
        beneficiary = _beneficiary;

        buyCurve = _buyCurve;
        sellCurve = _sellCurve;

        // TODO: validate dividend ratio
        bondedToken = _bondedToken;
        dividendRatio = _dividendRatio;
    }
    
    /// @notice             Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns(uint256) {
        return buyCurve.calcMintPrice(bondedToken.totalSupply(), numTokens);
    }

    /// @notice             Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns(uint256) {
        return sellCurve.calcBurnReward(bondedToken.totalSupply(), numTokens);
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

    /// @notice             Buy new tokens with reserve currency
    /// @param numTokens    The number of bonded tokens to buy
    function buy(uint256 numTokens) public {
        uint256 buyPrice = buyCurve.calcMintPrice(bondedToken.totalSupply(), numTokens);
        uint256 sellPrice = sellCurve.calcMintPrice(bondedToken.totalSupply(), numTokens);
        
        uint256 tokensToBeneficiary = buyPrice.sub(sellPrice);
        uint256 tokensToReserve = sellPrice;
        
        bondedToken.mint(msg.sender, numTokens); //TODO: Require? How does it fail?
        
        emit Mint(numTokens, buyPrice);
        
        require(reserveToken.transferFrom(msg.sender, address(this), buyPrice), TRANSFER_FROM_FAILED);
        
        buybackReserve = buybackReserve.add(tokensToReserve);
        reserveToken.transfer(beneficiary, tokensToBeneficiary); //TODO: Handle failure case? We want it to not care if transfer fails
    }

    /// @notice             Sell tokens to receive reserve currency
    /// @param numTokens    The number of bonded tokens to sell
    function sell(uint256 numTokens) public {
        require(bondedToken.balanceOf(msg.sender) >= numTokens, INSUFFICENT_TOKENS);
        
        uint256 burnReward = sellCurve.calcBurnReward(bondedToken.totalSupply(), numTokens);

        bondedToken.burn(msg.sender, numTokens);
        buybackReserve = buybackReserve.sub(burnReward);

        emit Burn(numTokens, burnReward);

        reserveToken.transfer(msg.sender, burnReward);
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
