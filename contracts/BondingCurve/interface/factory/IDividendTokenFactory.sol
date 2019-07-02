pragma solidity ^0.5.4;

contract IDividendTokenFactory {
    event DividendTokenDeployed(address indexed deployedAddress, address indexed sender);
    
    function deploy(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address payable _controller,
        address _paymentToken,
        bool _transfersEnabled
    ) public returns (address);
}