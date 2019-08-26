pragma solidity ^0.5.6;

import "./RewardsDistributor.sol";


/// @title RewardsDistributorWrapper
/// @author Bogdan Batog (https://batog.info)
/// @dev ONLY FOR TESTING. DO NOT DEPLOY THIS!!!!!
contract RewardsDistributorWrapper is RewardsDistributor {

    /// @notice Deposit funds into contract.
    function deposit(address staker, uint tokens) public returns (bool success) {
        return _deposit(staker, tokens);
    }

    /// @notice Distribute tokens pro rata to all stakers.
    function distribute(uint tokens) public returns (bool success) {
        return _distribute(tokens);
    }

    /// @notice Withdraw accumulated reward for the staker address.
    function withdrawReward(address staker) public returns (uint tokens) {
        return _withdrawReward(staker);
    }

    /// @notice Withdraw all stake for the staker address.
    function withdrawAllStake(address staker) public returns (uint tokens) {
        tokens = getStake(staker);
        _withdrawStake(staker, tokens);

        return tokens;
    }

    /// @notice Withdraw stake for the staker address.
    function withdrawStake(address staker, uint tokens) public returns (bool success) {
        return _withdrawStake(staker, tokens);
    }
}

