pragma solidity ^0.5.7;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";

import "../dividend/RewardsDistributor.sol";

/**
 * @title Dividend Token
 * @dev A standard ERC20, using Detailed & Mintable featurs. Accepts a single minter, which should be the BondingCurve. The minter also has exclusive burning rights.
 */
contract BondedToken is Initializable, ERC20Detailed, ERC20Mintable {
    RewardsDistributor internal _rewardsDistributor;
    IERC20 internal _dividendToken;

    /// @dev Initialize contract
    /// @param name ERC20 token name
    /// @param symbol ERC20 token symbol
    /// @param decimals ERC20 token decimals
    /// @param minter Address to give exclusive minting and burning rights for token
    /// @param rewardsDistributor Instance for managing dividend accounting.
    /// @param dividendToken Instance of ERC20 in which dividends are paid.
    function initialize(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address minter,
        RewardsDistributor rewardsDistributor,
        IERC20 dividendToken
    ) public initializer {
        ERC20Detailed.initialize(name, symbol, decimals);
        ERC20Mintable.initialize(minter);

        _rewardsDistributor = rewardsDistributor;

        // TODO: uncomment below line once this contract is no longer used as PaymentToken in tests.
        // require(address(dividendToken) != address(0), "No dividend ERC20 contract provided.");

        _dividendToken = dividendToken;
    }

    /**
     * @dev Burns a specific amount of tokens.
     * @param value The amount of token to be burned.
     */
    function burn(address from, uint256 value) public onlyMinter {
        _burn(from, value);

        if (address(_rewardsDistributor) != address(0)) {
            _rewardsDistributor.withdrawStake(from, value);
        }
    }

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 value) public onlyMinter returns (bool) {
        ERC20Mintable.mint(to, value);

        if (address(_rewardsDistributor) != address(0)) {
            _rewardsDistributor.deposit(to, value);
        }
        return true;
    }

    /**
     * @dev Transfer token for a specified addresses
     * @param from The address to transfer from.
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     */
    function _transfer(address from, address to, uint256 value) internal {
        ERC20._transfer(from, to, value);

        if (address(_rewardsDistributor) != address(0)) {
            _rewardsDistributor.withdrawStake(from, value);
            _rewardsDistributor.deposit(to, value);
        }
    }

    /**
     * @dev Withdraw accumulated reward for the sender address.
     */
    function withdrawReward() public returns (uint256) {
        require(address(_rewardsDistributor) != address(0), "Rewards distributor not set");
        require(address(_dividendToken) != address(0), "Dividend token not set");

        address payable _staker = msg.sender;
        uint256 _amount = _rewardsDistributor.withdrawReward(_staker);
        _dividendToken.transfer(_staker, _amount);
        return _amount;
    }

    /**
     * @dev Reads current accumulated reward for address.
     * @param staker The address to query the reward balance for.
     */
    function getReward(address staker) public view returns (uint256 tokens) {
        require(address(_rewardsDistributor) != address(0), "Rewards distributor not set");
        return _rewardsDistributor.getReward(staker);
    }

    /**
     * Claim and allocate provided dividend tokens to all balances greater than ELIGIBLE_UNIT.
     */
    function distribute(address from, uint256 value) public returns (bool) {
        require(address(_rewardsDistributor) != address(0), "Rewards distributor not set");
        require(address(_dividendToken) != address(0), "Dividend token not set");

        if (value == 0) {
            return false;
        }

        require(
            _dividendToken.transferFrom(from, address(this), value),
            "Dividend TransferFrom Failed."
        );

        _rewardsDistributor.distribute(from, value);

        return true;
    }

    function getRewardsDistributor() external view returns (RewardsDistributor) {
        return _rewardsDistributor;
    }

    function getDividendToken() external view returns (IERC20) {
        return _dividendToken;
    }

}
