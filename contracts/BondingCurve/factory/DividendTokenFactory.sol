pragma solidity ^0.5.4;

import "../dividend/DividendToken.sol";
import "../interface/factory/IDividendTokenFactory.sol";

contract DividendTokenFactory is IDividendTokenFactory {
    
    function deploy(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address payable _controller,
        address _paymentToken,
        bool _transfersEnabled
    ) public returns (address) {
        DividendToken dividendToken = new DividendToken(
            _name,
            _symbol,
            _decimals,
            _controller,
            _paymentToken,
            _transfersEnabled
        );

        emit DividendTokenDeployed(
            address(dividendToken),
            msg.sender
        );

        return address(dividendToken);
    }
}