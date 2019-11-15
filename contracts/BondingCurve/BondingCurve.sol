pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./interface/ICurveLogic.sol";
import "./token/BondedToken.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurve is Initializable, Ownable, Pausable {
    using SafeMath for uint256;

    IERC20 internal _collateralToken;
    BondedToken internal _bondedToken;

    ICurveLogic internal _buyCurve;
    address internal _beneficiary;

    uint256 internal _reserveBalance;
    uint256 internal _reservePercentage;
    uint256 internal _dividendPercentage;

    uint256 private constant MAX_PERCENTAGE = 100;
    uint256 private constant MICRO_PAYMENT_THRESHOLD = 100;

    string internal constant TRANSFER_FROM_FAILED = "Transfer of collateralTokens from sender failed";
    string internal constant TOKEN_MINTING_FAILED = "bondedToken minting failed";
    string internal constant TRANSFER_TO_BENEFICIARY_FAILED = "Tranfer of collateralTokens to beneficiary failed";
    string internal constant INSUFFICENT_TOKENS = "Insufficent tokens";
    string internal constant MAX_PRICE_EXCEEDED = "Current price exceedes maximum specified";
    string internal constant PRICE_BELOW_MIN = "Current price is below minimum specified";
    string internal constant REQUIRE_NON_ZERO_NUM_TOKENS = "Must specify a non-zero amount of bondedTokens";
    string internal constant SELL_CURVE_LARGER = "Buy curve value must be greater than Sell curve value";
    string internal constant SPLIT_ON_PAY_INVALID = "dividendPercentage must be a valid percentage";
    string internal constant SPLIT_ON_BUY_INVALID = "reservePercentage must be a valid percentage";
    string internal constant SPLIT_ON_PAY_MATH_ERROR = "dividendPercentage splits returned a greater token value than input value";
    string internal constant NO_MICRO_PAYMENTS = "Payment amount must be greater than 100 'units' for calculations to work correctly";
    string internal constant TOKEN_BURN_FAILED = "bondedToken burn failed";
    string internal constant TRANSFER_TO_RECIPIENT_FAILED = "Transfer to recipient failed";

    event BeneficiarySet(address beneficiary);
    event BuyCurveSet(address buyCurve);
    event SellCurveSet(address sellCurve);
    event DividendPercentageSet(uint256 dividendPercentage);
    event ReservePercentageSet(uint256 reservePercentage);

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
        _isValiddividendPercentage(reservePercentage);
        _isValidreservePercentage(dividendPercentage);

        Ownable.initialize(owner);
        Pausable.initialize(owner);

        _beneficiary = beneficiary;

        _buyCurve = buyCurve;
        _bondedToken = bondedToken;
        _collateralToken = collateralToken;

        _reservePercentage = reservePercentage;
        _dividendPercentage = dividendPercentage;

        emit BuyCurveSet(address(_buyCurve));
        emit BeneficiarySet(_beneficiary);
        emit ReservePercentageSet(_reservePercentage);
        emit DividendPercentageSet(_dividendPercentage);
    }

    function _isValidreservePercentage(uint256 reservePercentage) internal view {
        require(reservePercentage <= MAX_PERCENTAGE, SPLIT_ON_BUY_INVALID);
    }

    function _isValiddividendPercentage(uint256 dividendPercentage) internal view {
        require(dividendPercentage <= MAX_PERCENTAGE, SPLIT_ON_PAY_INVALID);
    }

    /// @notice             Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns (uint256) {
        return _buyCurve.calcMintPrice(_bondedToken.totalSupply(), _reserveBalance, numTokens);
    }

    /// @notice             Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns (uint256) {
        uint256 buyPrice = priceToBuy(numTokens);
        return (buyPrice.mul(_reservePercentage)).div(MAX_PERCENTAGE);
    }

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens. If zero, any price is allowed.
    /// @param recipient    Address to send the new bondedTokens to
    function buy(uint256 numTokens, uint256 maxPrice, address recipient) public whenNotPaused {
        require(numTokens > 0, REQUIRE_NON_ZERO_NUM_TOKENS);

        uint256 buyPrice = priceToBuy(numTokens);

        if (maxPrice != 0) {
            require(buyPrice <= maxPrice, MAX_PRICE_EXCEEDED);
        }

        uint256 tokensToReserve = rewardForSell(numTokens);
        uint256 tokensToBeneficiary = buyPrice.sub(tokensToReserve);

        _reserveBalance = _reserveBalance.add(tokensToReserve);
        _bondedToken.mint(recipient, numTokens);

        require(
            _collateralToken.transferFrom(msg.sender, address(this), buyPrice),
            TRANSFER_FROM_FAILED
        );
        _collateralToken.transfer(_beneficiary, tokensToBeneficiary);

        emit Buy(msg.sender, recipient, numTokens, buyPrice, tokensToReserve, tokensToBeneficiary);
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send collateralTokens to
    function sell(uint256 numTokens, uint256 minPrice, address recipient) public whenNotPaused {
        require(numTokens > 0, REQUIRE_NON_ZERO_NUM_TOKENS);
        require(_bondedToken.balanceOf(msg.sender) >= numTokens, INSUFFICENT_TOKENS);

        uint256 burnReward = rewardForSell(numTokens);
        require(burnReward >= minPrice, PRICE_BELOW_MIN);

        _reserveBalance = _reserveBalance.sub(burnReward);

        _bondedToken.burn(msg.sender, numTokens);
        _collateralToken.transfer(recipient, burnReward);

        emit Sell(msg.sender, recipient, numTokens, burnReward);
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(uint256 amount) public {
        require(amount > MICRO_PAYMENT_THRESHOLD, NO_MICRO_PAYMENTS);

        IERC20 paymentToken = _collateralToken;

        uint256 tokensToBeneficiary;
        uint256 tokensToDividendHolders;

        tokensToDividendHolders = (amount.mul(_dividendPercentage)).div(MAX_PERCENTAGE);
        tokensToBeneficiary = amount.sub(tokensToDividendHolders);

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
        Admin Functions
    */

    /// @notice Set beneficiary to a new address
    /// @param beneficiary       New beneficiary
    function setBeneficiary(address beneficiary) public onlyOwner {
        _beneficiary = beneficiary;
        emit BeneficiarySet(_beneficiary);
    }

    /// @notice Set buy curve to a new address
    /// @param buyCurve       New buy curve
    function setBuyCurve(ICurveLogic buyCurve) public onlyOwner {
        _buyCurve = buyCurve;
        emit BuyCurveSet(address(_buyCurve));
    }

    /// @notice Set split on buy to new value
    /// @param reservePercentage   New split on buy value
    function setReservePercentage(uint256 reservePercentage) public onlyOwner {
        _isValidreservePercentage(reservePercentage);
        _reservePercentage = reservePercentage;
        emit ReservePercentageSet(_reservePercentage);
    }

    /// @notice Set split on pay to new value
    /// @param dividendPercentage       New split on pay value
    function setDividendPercentage(uint256 dividendPercentage) public onlyOwner {
        _isValiddividendPercentage(dividendPercentage);
        _dividendPercentage = dividendPercentage;
        emit DividendPercentageSet(_dividendPercentage);
    }

    /*
        Getter Functions
    */

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

    /// @notice Get beneficiary
    function beneficiary() public view returns (address) {
        return _beneficiary;
    }

    /// @notice Get reserve balance
    function reserveBalance() public view returns (uint256) {
        return _reserveBalance;
    }

    /// @notice Get split on buy parameter
    function reservePercentage() public view returns (uint256) {
        return _reservePercentage;
    }

    /// @notice Get split on pay parameter
    function dividendPercentage() public view returns (uint256) {
        return _dividendPercentage;
    }

    /// @notice Get minimum value accepted for payments
    function getPaymentThreshold() public view returns (uint256) {
        return MICRO_PAYMENT_THRESHOLD;
    }
}
