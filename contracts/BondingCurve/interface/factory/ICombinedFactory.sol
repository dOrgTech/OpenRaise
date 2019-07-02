pragma solidity ^0.5.4;

contract ICombinedFactory {

    event FundraisingDeployed(
        address indexed bondingCurve,
        address dividendToken,
        address buyCurve,
        address sellCurve
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
    address _reserveToken,
    uint _splitOnPay
  ) public returns(
    address bondingCurveAddr,
    address dividendTokenAddr,
    address buyCurveAddr,
    address sellCurveAddr
  );
}
