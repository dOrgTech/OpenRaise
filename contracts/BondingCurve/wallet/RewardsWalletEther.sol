pragma solidity ^0.5.6;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "contracts/BondingCurve/interface/IRewardsWalletEther.sol";
import "contracts/BondingCurve/interface/IRewardsDistributor.sol";
import "contracts/BondingCurve/interface/IUniswapExchange.sol";

/**
 * @title RewardsWalletEther
 */
contract RewardsWalletEther is Initializable, IRewardsWalletEther {
    using SafeMath for uint256;

    IRewardsDistributor _rewardsDistributor;
    IUniswapExchange _exchangeContract;

    string internal constant ONLY_REWARDS_TOKEN = "Only Rewards Token";
    string internal constant ONLY_FOR_ETHER_REWARDS_TOKEN = "Only functional for Ether as rewards currency";

    event Receive(address token, uint256 amount, address sender);
    event Convert(address fromToken, address toToken, uint256 amount);
    event Distribute(address token, uint256 amount);

    /// Initialize the contract.
    function initialize(IRewardsDistributor rewardsDistributor, IUniswapExchange exchangeContract)
        public
        initializer
    {
        _rewardsDistributor = rewardsDistributor;
        _exchangeContract = exchangeContract;
    }

    /// @notice Distribute wallet balance of specified token to dividend holders
    /// @dev This has open access, can be used to distribte tokens recieved on native ERC20 transfers
    /// @dev Tokens other than the reserve currency will be transferred via the exchange.
    function exchangeAndDistribute(IERC20 token, uint256 amount, uint256 minOut, uint256 deadline)
        external
        returns (uint256 amountOut)
    {
        token.approve(address(_exchangeContract), amount);
        amountOut = _exchangeContract.tokenToEthSwapInput(amount, minOut, deadline);

        emit Receive(address(0), amountOut, msg.sender);
        _distribute(amountOut);
    }

    function _distribute(uint256 amount) internal {
        address(uint160(address(_rewardsDistributor))).transfer(amount);
        _rewardsDistributor.distribute(address(this), amount);
        emit Distribute(address(0), amount);
    }

    /// @notice Automatically distribute ETH on payments
    function() external payable {
        emit Receive(address(0), msg.value, msg.sender);
        _distribute(msg.value);
    }
}
