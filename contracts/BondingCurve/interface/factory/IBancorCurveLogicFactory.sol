pragma solidity ^0.5.4;

contract IBancorCurveLogicFactory {
    
    event BancorCurveLogicDeployed(
        address indexed deployedAddress,
        address indexed sender
    );
    
    function deploy(
        uint32 _reserveRatio
    ) public returns (address);
}