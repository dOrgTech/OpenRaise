pragma solidity ^0.5.2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol";

contract StakerRole is Initializable, Context {
    using Roles for Roles.Role;

    event StakerAdded(address indexed account);
    event StakerRemoved(address indexed account);

    Roles.Role private _stakers;

    function initialize(address sender) public initializer {
        if (!isStaker(sender)) {
            _addStaker(sender);
        }
    }

    modifier onlyStaker() {
        require(isStaker(_msgSender()), "StakerRole: caller does not have the Staker role");
        _;
    }

    function isStaker(address account) public view returns (bool) {
        return _stakers.has(account);
    }

    function addStaker(address account) public onlyStaker {
        _addStaker(account);
    }

    function renounceStaker() public {
        _removeStaker(_msgSender());
    }

    function _addStaker(address account) internal {
        _stakers.add(account);
        emit StakerAdded(account);
    }

    function _removeStaker(address account) internal {
        _stakers.remove(account);
        emit StakerRemoved(account);
    }

    uint256[50] private ______gap;
}
