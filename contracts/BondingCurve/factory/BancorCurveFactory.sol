pragma solidity ^0.5.4;

import "../dividend/DividendToken.sol";
import "../BondingCurve.sol";
import "../interface/ICurveLogic.sol";
import "../curve/BancorCurve.sol";

library BancorCurveFactory {

  event BondingCurveCreated(
    address _bondingCurve,
    address _dividendToken,
    address _buyCurve,
    address _sellCurve
  );

  /// @notice Deploy a bonding curve with all new components.
  /// @param _name Bonded token name.
  /// @param _symbol Bonded token symbol.
  /// @param _owner Owner of bonding curve.
  /// @param _beneficiary Beneficiary of bonding curve.
  /// @param _buyParams Bancor reserveRatio.
  /// @param _sellParams Bancor reserveRatio.
  /// @param _reserveToken Reserve token to buy Bonded tokens.
  /// @param _splitOnPay Percentage allocated to beneficiary on revenue. The remainder is allocated to Bonded token holders.
  function deploy(
    string memory _name,
    string memory _symbol,
    address _owner,
    address payable _beneficiary,
    uint32 _buyParams,
    uint32 _sellParams,
    ERC20 _reserveToken,
    uint _splitOnPay
  ) public returns(
    BondingCurve bondingCurveAddr,
    DividendToken dividendTokenAddr,
    ICurveLogic buyCurveAddr,
    ICurveLogic sellCurveAddr
  )
  {
    BancorCurve buyCurve = new BancorCurve(_buyParams);
    BancorCurve sellCurve = new BancorCurve(_sellParams);

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
      _splitOnPay
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
