pragma solidity ^0.5.4;

import "../curve/BancorCurveLogic.sol";
import "../interface/factory/IBancorCurveLogicFactory.sol";

contract BancorCurveLogicFactory is IBancorCurveLogicFactory {

    function deploy(
        uint32 _reserveRatio
    ) public returns (address) {
        BancorCurveLogic BancorCurveLogic = new BancorCurveLogic(
            _reserveRatio
        );

        emit BancorCurveLogicDeployed(
            address(BancorCurveLogic),
            msg.sender
        );

        return address(BancorCurveLogic);
    }
}