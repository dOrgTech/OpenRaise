pragma solidity ^0.5.6;

contract IRewardsDistributor {
    /// @notice Deposit funds into contract.
    function deposit(address staker, uint256 tokens) public returns (bool success);

    /// @notice Distribute tokens pro rata to all stakers.
    function distribute(address from, uint256 tokens) public returns (bool success);

    /// @notice Withdraw accumulated reward for the staker address.
    function withdrawReward(address staker) public returns (uint256 tokens);

    /// @notice Withdraw stake for the staker address
    function withdrawStake(address staker, uint256 tokens) public returns (bool);

    /// @notice Withdraw stake for the staker address
    function withdrawAllStake(address staker) public returns (bool);

    ///
    /// READ ONLY
    ///

    /// @notice Read total stake.
    function getStakeTotal() public view returns (uint256);
    /// @notice Read current stake for address.
    function getStake(address staker) public view returns (uint256 tokens);

    /// @notice Read current accumulated reward for address.
    function getReward(address staker) public view returns (uint256 tokens);

}
