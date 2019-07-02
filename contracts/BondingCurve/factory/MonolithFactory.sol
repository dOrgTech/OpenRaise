pragma solidity ^0.5.4;

import "../dividend/DividendToken.sol";
import "../BondingCurve.sol";
import "../interface/ICurveLogic.sol";
import "../curve/BancorCurveLogic.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

library MonolithFactory {

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
    uint32 _buyParam,
    uint32 _sellParam,
    IERC20 _reserveToken,
    uint _dividendRatio
  ) public returns(
    BondingCurve bondingCurveAddr,
    DividendToken dividendTokenAddr,
    ICurveLogic buyCurveAddr,
    ICurveLogic sellCurveAddr
  )
  {
    BancorCurveLogic buyCurve = new BancorCurveLogic(_buyParam);
    BancorCurveLogic sellCurve = new BancorCurveLogic(_sellParam);

    DividendToken dividendToken = new DividendToken(
      _name,
      _symbol,
      18,
      address(uint160(address(this))), //Cast to address payable
      address(_reserveToken),
      true
    );

    BondingCurve bondingCurve = new BondingCurve(
      address(_reserveToken),
      _beneficiary,
      address(buyCurve),
      address(sellCurve),
      address(dividendToken),
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