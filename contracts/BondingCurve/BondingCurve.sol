pragma solidity ^0.5.7;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "zos-lib/contracts/Initializable.sol";
import "./interface/ICurveLogic.sol";
import "./dividend/DividendPool.sol";
import "./token/BondedToken.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurve is Initializable, Ownable {
    using SafeMath for uint256;

    IERC20 public reserveToken;
    BondedToken public bondedToken;

    ICurveLogic public buyCurve;
    ICurveLogic public sellCurve;
    address public beneficiary;

    uint256 public reserveBalance;
    uint256 public splitOnPay;

    DividendPool dividendPool;

    uint256 private constant PRECISION = 10000;

    string internal constant TRANSFER_FROM_FAILED = "Transfer of reserveTokens from sender failed";
    string internal constant TOKEN_MINTING_FAILED = "bondedToken minting failed";
    string internal constant TRANSFER_TO_BENEFICIARY_FAILED = "Tranfer of reserveTokens to beneficiary failed";
    string internal constant INSUFFICENT_TOKENS = "Insufficent tokens";
    string internal constant MAX_PRICE_EXCEEDED = "Current price exceedes maximum specified";
    string internal constant PRICE_BELOW_MIN = "Current price is below minimum specified";
    string internal constant REQUIRE_NON_ZERO_NUM_TOKENS = "Must specify a non-zero amount of bondedTokens";
    string internal constant SELL_CURVE_LARGER = "Buy curve value must be greater than Sell curve value";
    string internal constant SPLIT_ON_PAY_INVALID = "splitOnPay must be a valid percentage (when divided by precision";

    event BeneficiarySet(address beneficiary);

    event Buy(address indexed buyer, address indexed recipient, uint256 amount, uint256 price);
    event Sell(address indexed seller, address indexed recipient, uint256 amount, uint256 reward);

    function initialize(
        address _owner,
        address _beneficiary,
        IERC20 _reserveToken,
        BondedToken _bondedToken,
        ICurveLogic _buyCurve,
        ICurveLogic _sellCurve,
        DividendPool _dividendPool,
        uint256 _splitOnPay
    ) public initializer {
        require(_splitOnPay > PRECISION && _splitOnPay < PRECISION.mul(100), SPLIT_ON_PAY_INVALID);

        Ownable.initialize(_owner);
        
        //TODO: Use setBeneficiary - owner should have been already set now
        beneficiary = _beneficiary;
        emit BeneficiarySet(beneficiary);

        buyCurve = _buyCurve;
        sellCurve = _sellCurve;
        bondedToken = _bondedToken;
        reserveToken =  _reserveToken;
        dividendPool = _dividendPool;

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

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens. If zero, any price is allowed.
    /// @param recipient    Address to send the new bondedTokens to
    function buy(uint256 numTokens, uint256 maxPrice, address recipient)
        public
        returns (uint256 collateralSent)
    {
        require(numTokens > 0, REQUIRE_NON_ZERO_NUM_TOKENS);

        uint256 buyPrice = priceToBuy(numTokens);

        if (maxPrice != 0) {
            require(buyPrice <= maxPrice, MAX_PRICE_EXCEEDED);
        }

        uint256 sellPrice = rewardForSell(numTokens);

        uint256 tokensToBeneficiary;
        uint256 tokensToReserve;

        require(buyPrice > sellPrice, SELL_CURVE_LARGER);

        tokensToBeneficiary = buyPrice.sub(sellPrice);
        tokensToReserve = sellPrice;

        require(bondedToken.mint(recipient, numTokens), TOKEN_MINTING_FAILED);

        reserveBalance = reserveBalance.add(tokensToReserve);
        require(
            reserveToken.transferFrom(msg.sender, address(this), buyPrice),
            TRANSFER_FROM_FAILED
        );

        require(
            reserveToken.transfer(beneficiary, tokensToBeneficiary),
            TRANSFER_TO_BENEFICIARY_FAILED
        );

        emit Buy(msg.sender, recipient, numTokens, buyPrice);

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
        require(numTokens > 0, REQUIRE_NON_ZERO_NUM_TOKENS);
        require(bondedToken.balanceOf(msg.sender) >= numTokens, INSUFFICENT_TOKENS);

        uint256 burnReward = rewardForSell(numTokens);
        require(burnReward >= minPrice, PRICE_BELOW_MIN);

        bondedToken.burn(msg.sender, numTokens);
        reserveBalance = reserveBalance.sub(burnReward);

        reserveToken.transfer(recipient, burnReward);

        emit Sell(msg.sender, recipient, numTokens, burnReward);

        return burnReward;
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
        //TODO: Get payment token from dividendPool
        IERC20 paymentToken = IERC20(reserveToken);

        uint256 tokensToBeneficiary;
        uint256 tokensToDividendHolders;

        // Calculate amounts to beneficiary and dividend holders based on splitOnPay
        if (splitOnPay == 0) {
            tokensToDividendHolders = amount;
        } else if (splitOnPay == PRECISION.mul(100)) {
            tokensToBeneficiary = amount;
        } else {
            uint256 beneficiaryPercentage = splitOnPay.div(PRECISION);
            uint256 dividendPercentage = PRECISION.sub(splitOnPay).div(PRECISION);

            tokensToBeneficiary = amount.mul(beneficiaryPercentage);
            tokensToDividendHolders = amount.mul(dividendPercentage);
        }

        assert(tokensToBeneficiary.add(tokensToDividendHolders) <= amount);

        require(paymentToken.transferFrom(msg.sender, address(this), amount), TRANSFER_FROM_FAILED);

        paymentToken.transfer(beneficiary, tokensToBeneficiary);
        paymentToken.transfer(address(dividendPool), tokensToDividendHolders);
    }

    function setBeneficiary(address _beneficiary) public onlyOwner {
        beneficiary = _beneficiary;
        emit BeneficiarySet(beneficiary);
    }

    function getSplitOnPayPrecision() public view returns (uint256) {
        return PRECISION;
    }
}
