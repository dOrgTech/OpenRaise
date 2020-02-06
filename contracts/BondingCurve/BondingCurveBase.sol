pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/interface/IBondedToken.sol";
import "contracts/BondingCurve/interface/IBondingCurve.sol";
import "contracts/BondingCurve/interface/ICurveLogic.sol";

/// @title A bonding curve implementation.
/// @author dOrg
contract BondingCurveBase is IBondingCurve, Initializable, Ownable, Pausable {
    using SafeMath for uint256;

    IBondedToken internal _bondedToken;

    ICurveLogic internal _buyCurve;
    address internal _beneficiary;

    uint256 internal _reserveBalance;
    uint256 internal _reservePercentage;
    uint256 internal _dividendPercentage;
    uint256 internal _preMintAmount;
    uint256 internal _milestoneCap;
    uint256 internal _totalRaised;

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
    event MilestoneCapSet(uint256 milestoneCap);

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
        IBondedToken bondedToken,
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
        _preMintAmount = 1 ether;

        // if (_hasPreMint()) {
        //     _bondedToken.mint(_beneficiary, _preMintAmount);
        // }

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

    function _isValidMilestoneCap(uint256 milestoneCap) internal view {
        require(milestoneCap >= _totalRaised);
    }

    function _isUnderMilestoneCap(uint256 amount) internal view {
        require(amount <= _milestoneCap);
    }

    function _hasPreMint() internal view returns (bool) {
        return _preMintAmount > 0;
    }

    function _totalSupplyWithoutPreMint() internal view returns (uint256) {
        if (_hasPreMint()) {
            return _bondedToken.totalSupply().sub(_preMintAmount);
        } else {
            return _bondedToken.totalSupply();
        }

    }

    /// @notice             Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns (uint256) {
        return _buyCurve.calcMintPrice(_totalSupplyWithoutPreMint(), _reserveBalance, numTokens);
    }

    /// @notice             Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns (uint256) {
        uint256 buyPrice = priceToBuy(numTokens);
        return (buyPrice.mul(_reservePercentage)).div(MAX_PERCENTAGE);
    }

    /*
        Abstract Functions
    */

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function sell(uint256 numTokens, uint256 minPrice, address recipient)
        public
        returns (uint256 collateralReceived);

    /*
        Internal Functions
    */

    function _preBuy(uint256 amount, uint256 maxPrice)
        internal
        returns (uint256 buyPrice, uint256 toReserve, uint256 toBeneficiary)
    {
        require(amount > 0, REQUIRE_NON_ZERO_NUM_TOKENS);

        buyPrice = priceToBuy(amount);

        if (maxPrice != 0) {
            require(buyPrice <= maxPrice, MAX_PRICE_EXCEEDED);
        }

        toReserve = rewardForSell(amount);
        toBeneficiary = buyPrice.sub(toReserve);

        _totalRaised = _totalRaised.add(toBeneficiary);
        _isUnderMilestoneCap(_totalRaised);
    }

    function _postBuy(
        address buyer,
        address recipient,
        uint256 amount,
        uint256 buyPrice,
        uint256 toReserve,
        uint256 toBeneficiary
    ) internal {
        _reserveBalance = _reserveBalance.add(toReserve);
        _bondedToken.mint(recipient, amount);

        emit Buy(buyer, recipient, amount, buyPrice, toReserve, toBeneficiary);
    }

    function _preSell(address seller, uint256 amount, uint256 minReturn)
        internal
        returns (uint256 burnReward)
    {
        require(amount > 0, REQUIRE_NON_ZERO_NUM_TOKENS);
        require(_bondedToken.balanceOf(seller) >= amount, INSUFFICENT_TOKENS);

        burnReward = rewardForSell(amount);
        require(burnReward >= minReturn, PRICE_BELOW_MIN);
    }

    function _postSell(address seller, uint256 amount, uint256 burnReward, address recipient)
        internal
    {
        _reserveBalance = _reserveBalance.sub(burnReward);
        _bondedToken.burn(seller, amount);

        emit Sell(seller, recipient, amount, burnReward);
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

    function setMilestoneCap(uint256 milestoneCap) public onlyOwner {
        _isValidMilestoneCap(milestoneCap);
        _milestoneCap = milestoneCap;
        emit MilestoneCapSet(_milestoneCap);
    }

    /*
        Getter Functions
    */

    /// @notice Get bonded token contract
    function bondedToken() public view returns (IBondedToken) {
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

    /// @notice Get pre mint amount
    function preMintAmount() public view returns (uint256) {
        return _preMintAmount;
    }

    /// @notice Get milestone cap
    function milestoneCap() public view returns (uint256) {
        return _milestoneCap;
    }

    /// @notice Get total sent to beneficiary
    function totalRaised() public view returns (uint256) {
        return _totalRaised;
    }

    /// @notice Get minimum value accepted for payments
    function getPaymentThreshold() public view returns (uint256) {
        return MICRO_PAYMENT_THRESHOLD;
    }
}
