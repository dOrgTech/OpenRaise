pragma solidity ^0.5.7;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "contracts/BondingCurve/dividend/RewardsDistributor.sol";
import "contracts/BondingCurve/token/BondedTokenBase.sol";

/**
 * @title Dividend Token
 * @dev A standard ERC20, using Detailed & Mintable featurs. Accepts a single minter, which should be the BondingCurve. The minter also has exclusive burning rights.
 */
contract BondedTokenEther is Initializable, BondedTokenBase {
    /// @dev Initialize contract
    /// @param name ERC20 token name
    /// @param symbol ERC20 token symbol
    /// @param decimals ERC20 token decimals
    /// @param minter Address to give exclusive minting and burning rights for token
    /// @param rewardsDistributor Instance for managing dividend accounting.
    function initialize(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address minter,
        RewardsDistributor rewardsDistributor
    ) public initializer {
        BondedTokenBase.initialize(name, symbol, decimals, minter, rewardsDistributor);
    }

    function _validateComponentAddresses() internal returns (bool) {
        if (address(_rewardsDistributor) == address(0)) {
            return false;
        }
        return true;
    }

    /**
     * @dev Withdraw accumulated reward for the sender address.
     */
    function withdrawReward() public returns (uint256) {
        if (!_validateComponentAddresses()) {
            return 0;
        }
        //    address payable _staker = msg.sender;
        //    uint256 _amount = _rewardsDistributor.withdrawReward(_staker);
        //    _dividendToken.transfer(_staker, _amount);
        //    return _amount;
    }

    /**
     * Claim and allocate provided dividend tokens to all balances greater than ELIGIBLE_UNIT.
     */
    function distribute(address from, uint256 value) public payable returns (bool) {
        if (!_validateComponentAddresses()) {
            return false;
        }

        if (value == 0) {
            return false;
        }

        //    require(
        //      _dividendToken.transferFrom(from, address(this), value),
        //      "Dividend TransferFrom Failed."
        //    );

        _rewardsDistributor.distribute(from, value);

        return true;
    }

}
