pragma solidity ^0.5.6;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "contracts/BondingCurve/interface/IRewardsDistributor.sol";
import "contracts/BondingCurve/interface/IUniswapExchange.sol";

/**
 * @title RewardsWalletERC20
 */
contract RewardsWalletERC20 is Initializable {
    using SafeMath for uint256;

    IERC20 _rewardsToken;
    IRewardsDistributor _rewardsDistributor;
    IUniswapExchange _exchange;

    string internal constant ONLY_REWARDS_TOKEN = "Only Rewards Token";
    string internal constant ONLY_FOR_ETHER_REWARDS_TOKEN = "Only functional for Ether as rewards currency";

    event Recieve(address token, uint256 amount, address sender);
    event Convert(address fromToken, address toToken, uint256 amount);
    event Distribute(address token, uint256 amount);

    /// Initialize the contract.
    function initialize(
        IERC20 rewardsToken,
        IRewardsDistributor rewardsDistributor,
        IUniswapExchange exchange
    ) public initializer {
        _rewardsToken = rewardsToken;
        _rewardsDistributor = rewardsDistributor;
        _exchange = exchange;
    }

    /// @dev Recieve payment and immediately distribute. Requires previous approval
    function pay(IERC20 token, uint256 amount) public {
        token.transferFrom(msg.sender, address(this), amount);
        _distribute(token, amount);
    }

    /// @notice Distribute wallet balance of specified token to dividend holders
    /// @dev This has open access, can be used to distribte tokens recieved on native ERC20 transfers
    /// @dev Tokens other than the reserve currency will be transferred via the exchange.
    function distribute(IERC20 token) public {
        require(_isRewardsToken(token), ONLY_REWARDS_TOKEN);
        uint256 walletBalance = token.balanceOf(address(this));
        _distribute(token, walletBalance);
    }

    function _distribute(IERC20 token, uint256 amount) internal {
        require(_isRewardsToken(token), ONLY_REWARDS_TOKEN);
        token.approve(address(_rewardsToken), amount);
        _rewardsDistributor.distribute(address(this), amount);
    }

    function _isRewardsToken(IERC20 token) internal returns (bool) {
        return address(token) == address(_rewardsToken);
    }

    function _isEtherAddress(address tokenAddress) internal returns (bool) {
        return tokenAddress == address(0);
    }
}
