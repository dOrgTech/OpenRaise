
pragma solidity ^0.5.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";


/// @title RewardsDistributor - Distribute pro rata rewards (dividends)
/// @author Bogdan Batog (https://batog.info)
/// @dev Distribute pro rata rewards (dividends) to token holders in O(1) time.
///      Based on http://batog.info/papers/scalable-reward-distribution.pdf
///      And on https://solmaz.io/2019/02/24/scalable-reward-changing/
contract RewardsDistributor {
    using SafeMath for uint256;

    /// @notice ELIGIBLE_UNIT is the smallest eligible unit for reward. Minimum
    ///  possible distribution is 1 (wei for Ether) PER ELIGIBLE_UNIT.
    ///
    ///  Only multiple of ELIGIBLE_UNIT will be subject to reward
    ///  distribution. Any fractional part of deposit, smaller than
    ///  ELIGIBLE_UNIT, won't receive any reward.
    ///
    ///  Recommended value 10**(decimals / 2), that is 10**9 for most ERC20.
    uint256 public ELIGIBLE_UNIT = 10**9;

    /// @notice Stake per address.
    mapping(address => uint256) stake;

    /// @notice Stake reminder per address.
    mapping(address => uint256) stakeReminder;

    /// @notice Total staked tokens. In ELIGIBLE_UNIT units.
    uint256 public stakeTotal;

    /// @notice Total reward since the beginning of time, in units per
    ///  ELIGIBLE_UNIT.
    uint256 rewardTotal;

    /// @notice Reminder from the last reward distribution.
    uint256 rewardRemainder;

    /// @notice Proportional rewards awarded *before* this stake was created.
    mapping(address => int256) rewardOffset;


    event DepositMade(address _from, uint value);
    event DistributionMade(address _from, uint value);
    event RewardWithdrawalMade(address _to, uint value);
    event StakeWithdrawalMade(address _to, uint value);


    /// Initialize the contract.
    constructor() public {
        stakeTotal = 0;
        rewardTotal = 0;
        rewardRemainder = 0;
    }


    /// @notice Deposit funds into contract.
    function _deposit(address staker, uint256 tokens) internal returns (bool success) {

        uint256 _tokensToAdd = tokens.add(stakeReminder[staker]);

        uint256 _eligibleUnitsToAdd = _tokensToAdd.div(ELIGIBLE_UNIT);

        // update the new reminder for this address
        stakeReminder[staker] = _tokensToAdd.mod(ELIGIBLE_UNIT);

        // set the current stake for this address
        stake[staker] = stake[staker].add(_eligibleUnitsToAdd);

        // update total eligible stake units
        stakeTotal = stakeTotal.add(_eligibleUnitsToAdd);

        // update reward offset
        rewardOffset[staker] += (int256)(rewardTotal * _eligibleUnitsToAdd);

        emit DepositMade(staker, tokens);
        return true;
    }


    /// @notice Distribute tokens pro rata to all stakers.
    function _distribute(uint tokens) internal returns (bool success) {
        require(tokens > 0);
        require(stakeTotal > 0);

        // add past distribution reminder
        uint256 _amountToDistribute = tokens.add(rewardRemainder);

        // determine rewards per eligible stake
        uint256 _ratio = _amountToDistribute.div(stakeTotal);

        // carry on reminder
        rewardRemainder = _amountToDistribute.mod(stakeTotal);

        // increase total rewards per stake unit
        rewardTotal = rewardTotal.add(_ratio);

        emit DistributionMade(msg.sender, tokens);
        return true;
    }


    /// @notice Withdraw accumulated reward for the staker address.
    function _withdrawReward(address staker) internal returns (uint256 tokens) {

        uint256 _reward = getReward(staker);

        // refresh reward offset (so a new call to getReward returns 0)
        rewardOffset[staker] = (int256) (rewardTotal.mul(stake[staker]));

        emit RewardWithdrawalMade(staker, _reward);
        return _reward;
    }


    /// @notice Withdraw stake for the staker address
    function _withdrawStake(address staker, uint256 tokens) internal returns (bool) {

        uint256 _currentStake = getStake(staker);

        require(tokens <= _currentStake);

        // update stake and reminder for this address
        uint256 _newStake = _currentStake.sub(tokens);

        stakeReminder[staker] = _newStake.mod(ELIGIBLE_UNIT);

        uint256 _eligibleUnitsDelta = stake[staker].sub(
            _newStake.div(ELIGIBLE_UNIT)
        );

        stake[staker] = stake[staker].sub(_eligibleUnitsDelta);

        // update total stake
        stakeTotal = stakeTotal.sub(_eligibleUnitsDelta);

        // update reward offset
        rewardOffset[staker] -= (int256) (rewardTotal.mul(_eligibleUnitsDelta));

        emit StakeWithdrawalMade(staker, tokens);
        return true;
    }

    ///
    /// READ ONLY
    ///

    /// @notice Read current stake for address.
    function getStake(address staker) public view returns (uint256 tokens) {
        tokens = (
            stake[staker].mul(ELIGIBLE_UNIT)
        ).add(
            stakeReminder[staker]
        );

        return tokens;
    }


    /// @notice Read current accumulated reward for address.
    function getReward(address staker) public view returns (uint256 tokens) {
        int256 _tokens = (
            (int256)(
                stake[staker].mul(rewardTotal)
            ) - rewardOffset[staker]
        );

        tokens = (uint256) (_tokens);

        return tokens;
    }

}

