pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/BondingCurveBase.sol";
import "contracts/BondingCurve/interface/IBondingCurve.sol";

/// @title A bonding curve implementation for buying a selling bonding curve tokens.
/// @author dOrg
/// @notice Uses Ether as reserve currency
contract BondingCurveEther is Initializable, BondingCurveBase {
  using SafeMath for uint256;

  string internal constant INSUFFICENT_ETHER = "Insufficent Ether";
  string internal constant INCORRECT_ETHER_SENT = "Incorrect Ether value sent";
  string internal constant MATH_ERROR_SPLITTING_COLLATERAL = "Calculated Split Invalid";

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
    BondingCurveBase.initialize(
      owner,
      beneficiary,
      bondedToken,
      buyCurve,
      reservePercentage,
      dividendPercentage
    );
  }

  function buy(uint256 amount, uint256 maxPrice, address recipient) public payable whenNotPaused {
    require(amount > 0, REQUIRE_NON_ZERO_NUM_TOKENS);
    require(msg.value == maxPrice, INCORRECT_ETHER_SENT);

    uint256 buyPrice = priceToBuy(amount);

    if (maxPrice != 0) {
      require(buyPrice <= maxPrice, MAX_PRICE_EXCEEDED);
    }

    uint256 etherToReserve = rewardForSell(amount);
    uint256 etherToBeneficiary = buyPrice.sub(etherToReserve);
    uint256 remainder = msg.value.sub(etherToReserve).sub(etherToBeneficiary);

    _reserveBalance = _reserveBalance.add(etherToReserve);
    _bondedToken.mint(recipient, amount);

    address(uint160(_beneficiary)).transfer(etherToBeneficiary);

    if (remainder > 0) {
      msg.sender.transfer(remainder);
    }

    emit Buy(msg.sender, recipient, amount, buyPrice, etherToReserve, etherToBeneficiary);
  }

  function sell(uint256 amount, uint256 minReturn, address recipient) public whenNotPaused {
    require(amount > 0, REQUIRE_NON_ZERO_NUM_TOKENS);
    require(_bondedToken.balanceOf(msg.sender) >= amount, INSUFFICENT_TOKENS);

    uint256 burnReward = rewardForSell(amount);
    require(burnReward >= minReturn, PRICE_BELOW_MIN);

    _reserveBalance = _reserveBalance.sub(burnReward);
    address(uint160(recipient)).transfer(burnReward);

    _bondedToken.burn(msg.sender, amount);

    emit Sell(msg.sender, recipient, amount, burnReward);
  }

  function pay(uint256 amount) public payable {
    require(amount > MICRO_PAYMENT_THRESHOLD, NO_MICRO_PAYMENTS);
    require(msg.value == amount, INCORRECT_ETHER_SENT);

    uint256 amountToDividendHolders = (amount.mul(_dividendPercentage)).div(MAX_PERCENTAGE);
    uint256 amountToBeneficiary = amount.sub(amountToDividendHolders);

    // outgoing funds to Beneficiary

    address(uint160(_beneficiary)).transfer(amountToBeneficiary);

    // outgoing funds to token holders as dividends (stored by BondedToken)
    _bondedToken.distribute(address(this), amountToDividendHolders);

    emit Pay(msg.sender, address(0), amount, amountToBeneficiary, amountToDividendHolders);
  }

  // // Interpret fallback as payment
  // function () public payable {
  //     pay(msg.value);
  // }

}
