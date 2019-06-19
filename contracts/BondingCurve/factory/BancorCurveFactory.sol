pragma solidity ^0.5.4;

import "../dividend/DividendToken.sol";
import "../BondingCurve.sol";
import "../interface/ICurveLogic.sol";
import "../logic/BancorCurve.sol";

library BancorCurveFactory {

  event BondingCurveCreated(
    address indexed _bondingCurve,
    address indexed _dividendToken,
    address _buyCurve,
    address _sellCurve
  );

  function deploy(
    string memory _name,
    string memory _symbol,
    address _owner,
    address payable _beneficiary,
    uint256[2] memory _buyParams,
    uint256[2] memory _sellParams,
    ERC20 _reserveToken,
    uint _dividendRatio
  ) public returns(
    BondingCurve bondingCurveAddr,
    DividendToken dividendTokenAddr,
    ICurveLogic buyCurveAddr,
    ICurveLogic sellCurveAddr
  )
  {
    LinearCurve buyCurve = new LinearCurve(_buyParams[0], _buyParams[1]);
    LinearCurve sellCurve = new LinearCurve(_sellParams[0], _sellParams[1]);

    DividendToken dividendToken = new DividendToken(
      _name,
      _symbol,
      18,
      address(uint160(address(this))), //Cast to address payable
      _reserveToken,
      true
    );

    BondingCurve bondingCurve = new BondingCurve(
      _reserveToken,
      _beneficiary,
      buyCurve,
      sellCurve,
      dividendToken,
      _dividendRatio
    );

    bondingCurve.transferOwnership(_owner);
    dividendToken.changeController(address(uint160(address(bondingCurve))));

    emit BondingCurveCreated(
      address(bondingCurve),
      address(dividendToken),
      address(buyCurve),
      address(sellCurve)
    );

    return (
      bondingCurve,
      dividendToken,
      buyCurve,
      sellCurve
    );
  }
}
