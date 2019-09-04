pragma solidity ^0.5.2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol";

contract FunderRole is Initializable, Context {
    using Roles for Roles.Role;

    event FunderAdded(address indexed account);
    event FunderRemoved(address indexed account);

    Roles.Role private _funders;

    function initialize(address sender) public initializer {
        if (!isFunder(sender)) {
            _addFunder(sender);
        }
    }

    modifier onlyFunder() {
        require(isFunder(_msgSender()), "FunderRole: caller does not have the Funder role");
        _;
    }

    function isFunder(address account) public view returns (bool) {
        return _funders.has(account);
    }

    function addFunder(address account) public onlyFunder {
        _addFunder(account);
    }

    function renounceFunder() public {
        _removeFunder(_msgSender());
    }

    function _addFunder(address account) internal {
        _funders.add(account);
        emit FunderAdded(account);
    }

    function _removeFunder(address account) internal {
        _funders.remove(account);
        emit FunderRemoved(account);
    }

    uint256[50] private ______gap;
}
