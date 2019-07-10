pragma solidity ^0.5.4;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "../curve/BancorCurveLogic.sol";
import "../dividend/DividendToken.sol";
import "../BondingCurve.sol";

contract CombinedFactory is Initializable {

    string constant BC_DAO_PACKAGE = "bc-dao";
    string constant BANCOR_CURVE_LOGIC = "BancorCurveLogic";
    string constant DIVIDEND_TOKEN = "DividendToken";
    string constant BONDING_CURVE = "BondingCurve";

    App public app;

    event FundraisingDeployed(
        address indexed bondingCurve,
        address indexed dividendToken,
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

    function _createDividendToken(bytes memory _data) public returns (address proxy) {
        address admin = address(0);
        return address(app.create(BC_DAO_PACKAGE, DIVIDEND_TOKEN, admin, _data));
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
    address payable _beneficiary,
    uint32 _buyParams,
    uint32 _sellParams,
    address _reserveToken,
    uint _splitOnPay
  ) public
  {
    address buyCurve = _createBancorCurveLogic("");
    address sellCurve = _createBancorCurveLogic("");
    address dividendToken = _createDividendToken("");
    address bondingCurve = _createBancorCurveLogic("");

    BancorCurveLogic(buyCurve).initialize(_buyParams);
    BancorCurveLogic(sellCurve).initialize(_sellParams);
    // DividendToken(dividendToken).initialize(
    //   _name,
    //   _symbol,
    //   _decimals,
    //   _beneficiary,
    //   _reserveToken,
    //   true
    // );
    // BondingCurve(bondingCurve).initialize(
    //   _reserveToken,
    //   _beneficiary,
    //   buyCurve,
    //   sellCurve,
    //   dividendToken,
    //   _splitOnPay
    // );


    // We could do one-line deploys by encoding the data and sending, as we do in the scheme.

    // UpgradeabilityProxy buyCurveProxy = new UpgradeabilityProxy(
    //     implRegistry.bondingCurveImpl(),
    //     abi.encodeWithSignature(
    //       BANCOR_CURVE_LOGIC_INIT_SELECTOR,
    //       _buyParams
    //     )
    // );

    // UpgradeabilityProxy sellCurveProxy = new UpgradeabilityProxy(
    //     implRegistry.bancorCurveLogicImpl(),
    //     abi.encodeWithSignature(
    //       BANCOR_CURVE_LOGIC_INIT_SELECTOR,
    //       _sellParams
    //     )
    // );
    // UpgradeabilityProxy dividendTokenProxy = new UpgradeabilityProxy(
    //     implRegistry.dividendTokenImpl(),
    //     abi.encodeWithSignature(
    //         DIVIDEND_TOKEN_INIT_SELECTOR,
    //         _name,
    //         _symbol,
    //         _decimals,
    //         address(uint160(address(this))), //Cast to address payable
    //         _reserveToken,
    //         true
    //     )
    // );
    // UpgradeabilityProxy bondingCurveProxy = new UpgradeabilityProxy(
    //     implRegistry.bondingCurveImpl(),
    //     abi.encodeWithSignature(
    //         BANCOR_CURVE_LOGIC_INIT_SELECTOR,
    //         _reserveToken,
    //         _beneficiary,
    //         address(buyCurveProxy),
    //         address(sellCurveProxy),
    //         address(dividendTokenProxy),
    //         _splitOnPay
    //     )
    // );

    emit FundraisingDeployed(
        bondingCurve,
        dividendToken,
        buyCurve,
        sellCurve,
        msg.sender
    );
  }
}
