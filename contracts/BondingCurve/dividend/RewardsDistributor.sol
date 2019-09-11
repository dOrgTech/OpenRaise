
pragma solidity ^0.5.6;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";


/**
 * @title RewardsDistributor - Distribute pro rata rewards (dividends)
 * @author Bogdan Batog (https://batog.info)
 * @dev Distribute pro rata rewards (dividends) to token holders in O(1) time.
 *      Based on [1] http://batog.info/papers/scalable-reward-distribution.pdf
 *      And on [2] https://solmaz.io/2019/02/24/scalable-reward-changing/
 */
contract RewardsDistributor is Initializable, Ownable {
    using SafeMath for uint256;

    /// @notice ELIGIBLE_UNIT is the smallest eligible unit for reward. Minimum
    ///  possible distribution is 1 (wei for Ether) PER ELIGIBLE_UNIT.
    ///
    ///  Only multiple of ELIGIBLE_UNIT will be subject to reward
    ///  distribution. Any fractional part of deposit, smaller than
    ///  ELIGIBLE_UNIT, won't receive any reward, but it will be tracked.
    ///
    ///  Recommended value 10**(decimals / 2), that is 10**9 for most ERC20.
    uint256 public constant ELIGIBLE_UNIT = 10**9;

    /// @notice Stake per address.
    mapping(address => uint256) internal _stake;

    /// @notice Stake remainder per address, smaller than ELIGIBLE_UNIT.
    mapping(address => uint256) internal _stakeRemainder;

    /// @notice Total staked tokens. In ELIGIBLE_UNIT units.
    uint256 internal _stakeTotal;

    /// @notice Total accumulated reward since the beginning of time, in units
    /// per ELIGIBLE_UNIT.
    uint256 internal _rewardTotal;

    /// @notice Remainder from the last _distribute() call, this amount was not
    /// enough to award at least 1 wei to every staked ELIGIBLE_UNIT. At the
    /// time of last _distribute() call _rewardRemainder < _stakeTotal.
    /// Note that later, _stakeTotal can decrease, but _rewardRemainder will
    /// stay unchanged until the next call to _distribute().
    uint256 internal _rewardRemainder;

    /// @notice Proportional rewards awarded *before* this stake was created.
    /// See [2] for more details.
    mapping(address => int256) _rewardOffset;


    event DepositMade(address indexed from, uint256 value);
    event DistributionMade(address indexed from, uint256 value);
    event RewardWithdrawalMade(address indexed to, uint256 value);
    event StakeWithdrawalMade(address indexed to, uint256 value);


    /// Initialize the contract.
    /// @param owner Contract owner, can call functions that change state.
    function initialize(address owner) public initializer {
        Ownable.initialize(owner);

        _stakeTotal = 0;
        _rewardTotal = 0;
        _rewardRemainder = 0;
    }


    /// @notice Deposit funds into contract.
    function deposit(address staker, uint256 tokens) public onlyOwner returns (bool success) {

        uint256 _tokensToAdd = tokens.add(_stakeRemainder[staker]);

        uint256 _eligibleUnitsToAdd = _tokensToAdd.div(ELIGIBLE_UNIT);

        // update the new remainder for this address
        _stakeRemainder[staker] = _tokensToAdd.mod(ELIGIBLE_UNIT);

        // set the current stake for this address
        _stake[staker] = _stake[staker].add(_eligibleUnitsToAdd);

        // update total eligible stake units
        _stakeTotal = _stakeTotal.add(_eligibleUnitsToAdd);

        // update reward offset
        _rewardOffset[staker] += (int256)(_rewardTotal * _eligibleUnitsToAdd);

        emit DepositMade(staker, tokens);
        return true;
    }


    /// @notice Distribute tokens pro rata to all stakers.
    function distribute(address from, uint tokens) public onlyOwner returns (bool success) {
        require(tokens > 0);
        require(_stakeTotal > 0);

        // add past distribution remainder
        uint256 _amountToDistribute = tokens.add(_rewardRemainder);

        // determine rewards per eligible stake
        uint256 _ratio = _amountToDistribute.div(_stakeTotal);

        // carry on remainder
        _rewardRemainder = _amountToDistribute.mod(_stakeTotal);

        // increase total rewards per stake unit
        _rewardTotal = _rewardTotal.add(_ratio);

        emit DistributionMade(from, tokens);
        return true;
    }


    /// @notice Withdraw accumulated reward for the staker address.
    function withdrawReward(address staker) public onlyOwner returns (uint256 tokens) {

        uint256 _reward = getReward(staker);

        // refresh reward offset (so a new call to getReward returns 0)
        _rewardOffset[staker] = (int256) (_rewardTotal.mul(_stake[staker]));

        emit RewardWithdrawalMade(staker, _reward);
        return _reward;
    }


    /// @notice Withdraw stake for the staker address
    function withdrawStake(address staker, uint256 tokens) public onlyOwner returns (bool) {

        uint256 _currentStake = getStake(staker);

        require(tokens <= _currentStake);

        // update stake and remainder for this address
        uint256 _newStake = _currentStake.sub(tokens);

        _stakeRemainder[staker] = _newStake.mod(ELIGIBLE_UNIT);

        uint256 _eligibleUnitsDelta = _stake[staker].sub(
            _newStake.div(ELIGIBLE_UNIT)
        );

        _stake[staker] = _stake[staker].sub(_eligibleUnitsDelta);

        // update total stake
        _stakeTotal = _stakeTotal.sub(_eligibleUnitsDelta);

        // update reward offset
        _rewardOffset[staker] -= (int256) (_rewardTotal.mul(_eligibleUnitsDelta));

        emit StakeWithdrawalMade(staker, tokens);
        return true;
    }


    /// @notice Withdraw stake for the staker address
    function withdrawAllStake(address staker) public onlyOwner returns (bool) {
        uint256 _currentStake = getStake(staker);
        return withdrawStake(staker, _currentStake);
    }

    ///
    /// READ ONLY
    ///


    /// @notice Read total stake.
    function getStakeTotal() public view returns (uint256) {
        return _stakeTotal.mul(ELIGIBLE_UNIT);
    }


    /// @notice Read current stake for address.
    function getStake(address staker) public view returns (uint256 tokens) {
        tokens = (
            _stake[staker].mul(ELIGIBLE_UNIT)
        ).add(
            _stakeRemainder[staker]
        );

        return tokens;
    }


    /// @notice Read current accumulated reward for address.
    function getReward(address staker) public view returns (uint256 tokens) {
        int256 _tokens = (
            (int256)(
                _stake[staker].mul(_rewardTotal)
            ) - _rewardOffset[staker]
        );

        tokens = (uint256) (_tokens);

        return tokens;
    }

}

