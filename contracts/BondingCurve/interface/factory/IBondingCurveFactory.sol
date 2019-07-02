pragma solidity ^0.5.4;

contract IBondingCurveFactory {
  event BondingCurveDeployed(address indexed deployedAddress, address indexed sender);

  function deploy(
    address _reserveToken,
    address payable _beneficiary,
    address _buyCurve,
    address _sellCurve,
    address _bondedToken,
    uint256 _splitOnPay
  ) public returns(address);
}
