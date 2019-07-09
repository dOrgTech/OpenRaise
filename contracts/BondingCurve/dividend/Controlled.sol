pragma solidity ^0.5.4;

import "zos-lib/contracts/Initializable.sol";

/// Taken from Giveth's MiniMeToken: https://github.com/Giveth/minime
contract Controlled is Initializable{
    /// @notice The address of the controller is the only address that can call
    ///  a function with this modifier
    modifier onlyController { 
        require(msg.sender == controller); _; 
    }

    address payable controller;

    function initialize(address payable _controller) public initializer {
        controller = _controller;
    }

    /// @notice Changes the controller of the contract
    /// @param _newController The new controller of the contract
    function changeController(address payable _newController) public onlyController {
        controller = _newController;
    }
}