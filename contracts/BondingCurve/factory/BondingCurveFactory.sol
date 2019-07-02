pragma solidity ^0.5.4;

import "../BondingCurve.sol";
import "../interface/factory/IBondingCurveFactory.sol";

contract BondingCurveFactory is IBondingCurveFactory{

  event BondingCurveDeployed(address indexed deployedAddress);

  function deploy(
    address _reserveToken,
    address payable _beneficiary,
    address _buyCurve,
    address _sellCurve,
    address _bondedToken,
    uint256 _splitOnPay
  ) public returns(address)
  {

    BondingCurve bondingCurve = new BondingCurve(
      _reserveToken,
      _beneficiary,
      _buyCurve,
      _sellCurve,
      _bondedToken,
      _splitOnPay
    );

    emit BondingCurveDeployed(
      address(bondingCurve),
      msg.sender
    );

    return address(bondingCurve);
  }
}
