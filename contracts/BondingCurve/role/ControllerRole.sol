pragma solidity ^0.5.2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol";

contract ControllerRole is Initializable {
    using Roles for Roles.Role;

    event ControllerAdded(address indexed account);
    event ControllerRemoved(address indexed account);

    Roles.Role private _controllers;

    function initialize(address sender) public initializer {
        if (!isController(sender)) {
            _addController(sender);
        }
    }

    modifier onlyController() {
        require(
            isController(_msgSender()),
            "ControllerRole: caller does not have the Controller role"
        );
        _;
    }

    function isController(address account) public view returns (bool) {
        return _controllers.has(account);
    }

    function addController(address account) public onlyController {
        _addController(account);
    }

    function renounceController() public {
        _removeController(_msgSender());
    }

    function _addController(address account) internal {
        _controllers.add(account);
        emit ControllerAdded(account);
    }

    function _removeController(address account) internal {
        _controllers.remove(account);
        emit ControllerRemoved(account);
    }

    uint256[50] private ______gap;
}
