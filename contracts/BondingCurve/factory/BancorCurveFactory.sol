pragma solidity ^0.5.4;

import "../dividend/DividendToken.sol";
import "../BondingCurve.sol";
import "../interface/ICurveLogic.sol";
import "../logic/BancorCurve.sol";

contract BancorCurveFactory {

  event BondingCurveCreated(
    address _bondingCurve,
    address _dividendToken,
    address _buyCurve,
    address _sellCurve
  );

  /// @notice Deploy a bonding curve with all new components.
  /// @param name Bonded token name.
  /// @param symbol Bonded token symbol.
  /// @param owner Owner of bonding curve.
  /// @param beneficiary Beneficiary of bonding curve.
  /// @param buyParams Bancor reserveRatio.
  /// @param sellParams Bancor reserveRatio.
  /// @param reserveToken Reserve token to buy Bonded tokens.
  /// @param splitOnPay Percentage allocated to beneficiary on revenue. The remainder is allocated to Bonded token holders.
  function deploy(
    string memory _name,
    string memory _symbol,
    address _owner,
    address payable _beneficiary,
    uint256 memory _buyParams,
    uint256 memory _sellParams,
    ERC20 _reserveToken,
    uint _splitOnPay
  ) public returns(
    BondingCurve bondingCurveAddr,
    DividendToken dividendTokenAddr,
    ICurveLogic buyCurveAddr,
    ICurveLogic sellCurveAddr
  )
  {
    LinearCurve buyCurve = new BancorCurve(_buyParams);
    LinearCurve sellCurve = new BancorCurve(_sellParams);

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
