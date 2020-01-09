pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/token/BondedToken.sol";
import "contracts/BondingCurve/interface/IBondingCurve.sol";
import "contracts/BondingCurve/interface/ICurveLogic.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses a defined ERC20 token as reserve currency
contract BondingCurveBase is Initializable, Ownable, Pausable {
    using SafeMath for uint256;

    BondedToken internal _bondedToken;

    ICurveLogic internal _buyCurve;
    address internal _beneficiary;

    uint256 internal _reserveBalance;
    uint256 internal _reservePercentage;
    uint256 internal _dividendPercentage;

    uint256 internal constant MAX_PERCENTAGE = 100;
    uint256 internal constant MICRO_PAYMENT_THRESHOLD = 100;

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
        _isValiddividendPercentage(reservePercentage);
        _isValidreservePercentage(dividendPercentage);

        Ownable.initialize(owner);
        Pausable.initialize(owner);

        _beneficiary = beneficiary;

        _buyCurve = buyCurve;
        _bondedToken = bondedToken;

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