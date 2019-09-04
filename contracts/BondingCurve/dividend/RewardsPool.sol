pragma solidity ^0.5.6;

import "./RewardsDistributor.sol";
import "../access/StakerRole.sol";
import "../access/FunderRole.sol";

/// @title RewardsPool
/// @author Bogdan Batog (https://batog.info)
/// @dev ONLY FOR TESTING. DO NOT DEPLOY THIS!!!!!
contract RewardsPool is RewardsDistributor, StakerRole, FunderRole {
    /// @notice Deposit funds into contract.
    function deposit(address staker, uint256 tokens) public onlyStaker returns (bool success) {
        return _deposit(staker, tokens);
    }

    /// @notice Distribute tokens pro rata to all stakers.
    function distribute(uint256 tokens) public FunderRole returns (bool success) {
        return _distribute(address(0), tokens);
    }

    /// @notice Withdraw accumulated reward for the staker address.
    function withdrawReward(address staker) public returns (uint256 tokens) {
        return _withdrawReward(staker);
    }

    /// @notice Withdraw all stake for the staker address.
    function withdrawAllStake(address staker) public returns (uint256 tokens) {
        tokens = getStake(staker);
        _withdrawStake(staker, tokens);

        return tokens;
    }

    /// @notice Withdraw stake for the staker address.
    function withdrawStake(address staker, uint256 tokens)
        public
        onlyStaker
        returns (bool success)
    {
        return _withdrawStake(staker, tokens);
    }
}
