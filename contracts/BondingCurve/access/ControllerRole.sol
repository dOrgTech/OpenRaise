pragma solidity ^0.5.2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol";

contract ControllerRole is Initializable {
    using Roles for Roles.Role;

    event ControllerAdded(address indexed account);
    event ControllerRemoved(address indexed account);

    Roles.Role private _controllers;

    function initialize(address sender) public initializer {
        _addController(sender);
    }

    modifier onlyController() {
        require(
            isController(msg.sender),
            "ControllerRole: caller does not have the Controller role"
        );
        _;
    }

    function isController(address account) public view returns (bool) {
        return _controllers.has(account);
    }

    function _addController(address account) internal {
        _controllers.add(account);
        emit ControllerAdded(account);
    }

    uint256[50] private ______gap;
}
