pragma solidity ^0.5.7;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "contracts/BondingCurve/curve/bancor-formula/BancorFormula.sol";

/**
 * @title Bancor Curve Service
 * @dev Logic singleton
 * This reduces deploy costs all allows the deploy of entire 'curve ecosystems' in one transaction by only allocating storage for the exponent array once
 */
contract BancorCurveService is Initializable, BancorFormula {
    using SafeMath for uint256;

    // mapping (uint256 => uint32) internal _params;
    // uint256 _paramsCount;

    function initialize() public initializer {
        BancorFormula.initialize();
    }
    
    // function addParams(uint32 params) {
    //     _params[_paramsCount] = params;
    //     _params.add(1);
    // }
}