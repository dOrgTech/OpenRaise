pragma solidity ^0.5.4;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "../BondingCurve.sol";
import "../curve/BancorCurveLogic.sol";
import "../dividend/ClaimsToken.sol";
import "../interface/ICurveLogic.sol";
import "../interface/IClaimsToken.sol";

contract CombinedFactory is Initializable {

    string constant BC_DAO_PACKAGE = "bc-dao";
    string constant BANCOR_CURVE_LOGIC = "BancorCurveLogic";
    string constant CLAIMS_TOKEN = "ClaimsToken";
    string constant BONDING_CURVE = "BondingCurve";

    App public app;

    event FundraisingDeployed(
        address indexed bondingCurve,
        address indexed claimsToken,
        address buyCurve,
        address sellCurve,
        address indexed sender
    );

    function initialize (address _appContractAddress) public initializer {
      app = App(_appContractAddress);
    }

    function _createBancorCurveLogic(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(BC_DAO_PACKAGE, BANCOR_CURVE_LOGIC, admin, _data));
    }

    function _createClaimsToken(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(BC_DAO_PACKAGE, CLAIMS_TOKEN, admin, _data));
    }

    function _createBondingCurve(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(BC_DAO_PACKAGE, BONDING_CURVE, admin, _data));
    }

  /// @notice Deploy a bonding curve with all new components.
  /// @param _name Bonded token name.
  /// @param _symbol Bonded token symbol.
  /// @param _decimals As per ERC20.
  /// @param _beneficiary Beneficiary of bonding curve.
  /// @param _buyParams Bancor reserveRatio.
  /// @param _sellParams Bancor reserveRatio.
  /// @param _reserveToken Reserve token to buy Bonded tokens.
  /// @param _splitOnPay Percentage allocated to beneficiary on revenue. The remainder is allocated to Bonded token holders.
  function deploy(
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    address _beneficiary,
    address _owner,
    uint32 _buyParams,
    uint32 _sellParams,
    IERC20 _reserveToken,
    uint _splitOnPay
  ) public
  {
    address buyCurve = _createBancorCurveLogic("");
    address sellCurve = _createBancorCurveLogic("");
    address claimsToken = _createClaimsToken("");
    address bondingCurve = _createBancorCurveLogic("");

    BancorCurveLogic(buyCurve).initialize(_buyParams);

    BancorCurveLogic(sellCurve).initialize(_sellParams);

    ClaimsToken(claimsToken).initialize(
      _name,
      _symbol,
      _decimals,
      _beneficiary,
      true
    );

    BondingCurve(bondingCurve).initialize(
      _reserveToken,
      _beneficiary,
      _owner,
      ICurveLogic(buyCurve),
      ICurveLogic(sellCurve),
      IClaimsToken(claimsToken),
      _splitOnPay
    );

    // We could do one-line deploys by encoding the data and sending, as we do in the scheme.
    //     abi.encodeWithSignature(
    //         BANCOR_CURVE_LOGIC_INIT_SELECTOR,
    //         _reserveToken,
    //         _beneficiary,
    //         address(buyCurveProxy),
    //         address(sellCurveProxy),
    //         address(claimsTokenProxy),
    //         _splitOnPay

    emit FundraisingDeployed(
        bondingCurve,
        claimsToken,
        buyCurve,
        sellCurve,
        msg.sender
    );
  }
}
