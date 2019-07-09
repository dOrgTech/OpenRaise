pragma solidity ^0.5.4;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";

contract CombinedFactory is Initializable {

    string constant BC_DAO_PACKAGE_NAME = "daostack-fundraising";
    string constant BANCOR_CURVE_LOGIC_NAME = "BancorCurveLogic";
    string constant DIVIDEND_TOKEN_NAME = "DividendToken";
    string constant BONDING_CURVE_NAME = "BondingCurve";

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

    /// @param _data uint32 reserveRatio
    function createBancorCurveLogicInstance(bytes memory _data) public returns (address proxy) {
      address admin = msg.sender;
      return address(app.create(BC_DAO_PACKAGE_NAME, BANCOR_CURVE_LOGIC_NAME, admin, _data));
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
  ) public returns(
    address bondingCurve,
    address dividendToken,
    address buyCurve,
    address sellCurve
  )
  {
    // bondingCurve = address(0);
    // dividendToken = address(0);
    // buyCurve = address(0);
    // sellCurve = address(0);

    // We can do one-line deploys by encoding the data and sending, as we do in the scheme. This is def the way to go.

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
        address(0),
        address(0),
        address(0),
        address(0),
        msg.sender
    );

    return (
        address(0),
        address(0),
        address(0),
        address(0)
    );
  }
}
