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

    IERC20 internal _collateralToken;
    BondedToken internal _bondedToken;

    ICurveLogic internal _buyCurve;
    ICurveLogic internal _sellCurve;
    address internal _beneficiary;

    uint256 internal _reserveBalance;
    uint256 internal _splitOnPay;

    DividendPool internal _dividendPool;

    uint256 private constant PRECISION = 10000;

    string internal constant TRANSFER_FROM_FAILED = "Transfer of collateralTokens from sender failed";
    string internal constant TOKEN_MINTING_FAILED = "bondedToken minting failed";
    string internal constant TRANSFER_TO_BENEFICIARY_FAILED = "Tranfer of collateralTokens to beneficiary failed";
    string internal constant INSUFFICENT_TOKENS = "Insufficent tokens";
    string internal constant MAX_PRICE_EXCEEDED = "Current price exceedes maximum specified";
    string internal constant PRICE_BELOW_MIN = "Current price is below minimum specified";
    string internal constant REQUIRE_NON_ZERO_NUM_TOKENS = "Must specify a non-zero amount of bondedTokens";
    string internal constant SELL_CURVE_LARGER = "Buy curve value must be greater than Sell curve value";
    string internal constant SPLIT_ON_PAY_INVALID = "splitOnPay must be a valid percentage (when divided by precision";

    event BeneficiarySet(address beneficiary);

    event Buy(address indexed buyer, address indexed recipient, uint256 amount, uint256 price);
    event Sell(address indexed seller, address indexed recipient, uint256 amount, uint256 reward);

    /// @dev Initialize contract
    /// @param owner Contract owner, can conduct administrative functions.
    /// @param beneficiary Recieves a proportion of incoming tokens on buy() and pay() operations.
    /// @param collateralToken Token accepted as collateral by the curve. (e.g. WETH or DAI)
    /// @param bondedToken Token native to the curve. The bondingCurve contract has exclusive rights to mint and burn tokens.
    /// @param buyCurve Curve logic for buy curve.
    /// @param sellCurve Curve logic for sell curve.
    /// @param dividendPool Pool to recieve and allocate tokens for bonded token holders.
    /// @param splitOnPay Percentage of incoming collateralTokens distributed to beneficiary on pay(). The remainder being distributed among current bondedToken holders. Divided by precision value.
    function initialize(
        address owner,
        address beneficiary,
        IERC20 collateralToken,
        BondedToken bondedToken,
        ICurveLogic buyCurve,
        ICurveLogic sellCurve,
        DividendPool dividendPool,
        uint256 splitOnPay
    ) public initializer {
        require(splitOnPay > PRECISION && splitOnPay < PRECISION.mul(100), SPLIT_ON_PAY_INVALID);

        Ownable.initialize(owner);

        _beneficiary = beneficiary;
        emit BeneficiarySet(_beneficiary);

        _buyCurve = buyCurve;
        _sellCurve = sellCurve;
        _bondedToken = bondedToken;
        _collateralToken = collateralToken;
        _dividendPool = dividendPool;

        _splitOnPay = splitOnPay;
    }

    /// @notice             Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns (uint256) {
        return _buyCurve.calcMintPrice(_bondedToken.totalSupply(), _reserveBalance, numTokens);
    }

    /// @notice             Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns (uint256) {
        return _sellCurve.calcBurnReward(_bondedToken.totalSupply(), _reserveBalance, numTokens);
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

        require(_bondedToken.mint(recipient, numTokens), TOKEN_MINTING_FAILED);

        _reserveBalance = _reserveBalance.add(tokensToReserve);
        require(
            _collateralToken.transferFrom(msg.sender, address(this), buyPrice),
            TRANSFER_FROM_FAILED
        );

        require(
            _collateralToken.transfer(_beneficiary, tokensToBeneficiary),
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
        require(_bondedToken.balanceOf(msg.sender) >= numTokens, INSUFFICENT_TOKENS);

        uint256 burnReward = rewardForSell(numTokens);
        require(burnReward >= minPrice, PRICE_BELOW_MIN);

        _bondedToken.burn(msg.sender, numTokens);
        _reserveBalance = _reserveBalance.sub(burnReward);

        _collateralToken.transfer(recipient, burnReward);

        emit Sell(msg.sender, recipient, numTokens, burnReward);

        return burnReward;
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
        //TODO: Get payment token from dividendPool
        IERC20 paymentToken = IERC20(_collateralToken);

        uint256 tokensToBeneficiary;
        uint256 tokensToDividendHolders;

        // Calculate amounts to beneficiary and dividend holders based on splitOnPay
        if (_splitOnPay == 0) {
            tokensToDividendHolders = amount;
        } else if (_splitOnPay == PRECISION.mul(100)) {
            tokensToBeneficiary = amount;
        } else {
            uint256 beneficiaryPercentage = _splitOnPay.div(PRECISION);
            uint256 dividendPercentage = PRECISION.sub(_splitOnPay).div(PRECISION);

            tokensToBeneficiary = amount.mul(beneficiaryPercentage);
            tokensToDividendHolders = amount.mul(dividendPercentage);
        }

        assert(tokensToBeneficiary.add(tokensToDividendHolders) <= amount);

        require(paymentToken.transferFrom(msg.sender, address(this), amount), TRANSFER_FROM_FAILED);

        paymentToken.transfer(_beneficiary, tokensToBeneficiary);
        paymentToken.transfer(address(_dividendPool), tokensToDividendHolders);
    }

    /*
        Admin Functions
    */

    /// @notice Set beneficiary to a new address
    /// @param beneficiary       New beneficiary
    function setBeneficiary(address beneficiary) public onlyOwner {
        _beneficiary = beneficiary;
        emit BeneficiarySet(_beneficiary);
    }

    /*
        Getter Functions
    */

    /// @notice Get precision value used for split on pay to faciliate off-chain calculations
    function splitOnPayPrecision() public view returns (uint256) {
        return PRECISION;
    }

    /// @notice Get reserve token contract
    function collateralToken() public view returns (IERC20) {
        return _collateralToken;
    }

    /// @notice Get bonded token contract
    function bondedToken() public view returns (BondedToken) {
        return _bondedToken;
    }

    /// @notice Get buy curve contract
    function buyCurve() public view returns (ICurveLogic) {
        return _buyCurve;
    }

    /// @notice Get sell curve contract
    function sellCurve() public view returns (ICurveLogic) {
        return _sellCurve;
    }

    /// @notice Get beneficiary
    function beneficiary() public view returns (address) {
        return _beneficiary;
    }

    /// @notice Get reserve balance
    function reserveBalance() public view returns (uint256) {
        return _reserveBalance;
    }

    /// @notice Get split on pay parameter
    function splitOnPay() public view returns (uint256) {
        return _splitOnPay;
    }

    /// @notice Get dividend pool contract
    function dividendPool() public view returns (DividendPool) {
        return _dividendPool;
    }
}
