pragma solidity ^0.5.6;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

contract IRewardsWalletEther {
    /// @notice Deposit funds into contract.
    function exchangeAndDistribute(IERC20 token, uint256 amount, uint256 minOut, uint256 deadline)
        external
        returns (uint256 amountOut);
}
