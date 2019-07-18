pragma solidity ^0.5.4;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/application/App.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";
import "../BondingCurve.sol";
import "../curve/BancorCurveLogic.sol";
import "../curve/StaticCurveLogic.sol";
import "../dividend/DividendPool.sol";
import "../token/BondedToken.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Combined Factory
 * @dev Allows for the deploy of a Bonding Curve and supporting components in a single transaction
 * This was developed to simplify the deployment process for DAOs
 */
contract CombinedFactory is Initializable {

    string constant BC_DAO_PACKAGE = "bc-dao";
    string constant STATIC_CURVE_LOGIC = "StaticCurveLogic";
    string constant BANCOR_CURVE_LOGIC = "BancorCurveLogic";
    string constant BONDED_TOKEN = "BondedToken";
    string constant DIVIDEND_POOL = "DividendPool";
    string constant BONDING_CURVE = "BondingCurve";

    mapping (uint => string) internal _curveTypeStrings;
    App internal _app;

    event BondingCurveDeployed(
        address indexed bondingCurve,
        address indexed bondedToken,
        address buyCurve,
        address sellCurve,
        address dividendPool,
        address indexed sender
    );
    /// @dev Initialize contract
    /// @param appContractAddress OpenZeppelin App contract used to instantiate new contract instances
    function initialize (address appContractAddress) internal initializer {
      _app = App(appContractAddress);

      // _curveTypeStrings[0] = STATIC_CURVE_LOGIC;
      // _curveTypeStrings[1] = BANCOR_CURVE_LOGIC;
    }

    function _createStaticCurveLogic(address _admin, bytes memory _data) internal returns (address proxy) {
        return address(_app.create(BC_DAO_PACKAGE, STATIC_CURVE_LOGIC, _admin, _data));
    }

    function _createBancorCurveLogic(address _admin, bytes memory _data) internal returns (address proxy) {
        return address(_app.create(BC_DAO_PACKAGE, BANCOR_CURVE_LOGIC, _admin, _data));
    }

    function _createDividendPool(address _admin, bytes memory _data) internal returns (address proxy) {
        return address(_app.create(BC_DAO_PACKAGE, DIVIDEND_POOL, _admin, _data));
    }

    function _createBondedToken(address _admin, bytes memory _data) internal returns (address proxy) {
        return address(_app.create(BC_DAO_PACKAGE, BONDED_TOKEN, _admin, _data));
    }

    function _createBondingCurve(address _admin, bytes memory _data) internal returns (address proxy) {
        return address(_app.create(BC_DAO_PACKAGE, BONDING_CURVE, _admin, _data));
    }

  function deploy() public {
    uint256 a = 1;
    a + 1;
  }

  function app() public view returns(address) {
    return address(_app);
  }

  /// @notice Deploy a bonding curve with all new components.
  /// @param bondedTokenName Bonded token name.
  /// @param bondedTokenSymbol Bonded token symbol.
  /// @param bondedTokenDecimals As per ERC20.
  /// @param beneficiary Beneficiary of bonding curve.
  /// @param owner Owner of bonding curve.
  /// @param buyCurveParams Parameters for
  /// @param sellCurveParams Parameters for.
  /// @param reserveToken Reserve token to buy Bonded tokens.
  /// @param splitOnPay Percentage allocated to beneficiary on revenue. The remainder is allocated to Bonded token holders.
  function deployBondingCurve(
    string memory bondedTokenName,
    string memory bondedTokenSymbol,
    uint8 bondedTokenDecimals,
    address beneficiary,
    address owner,
    uint256 buyCurveParams,
    uint256 sellCurveParams,
    IERC20 reserveToken,
    uint splitOnPay
  ) public
  {
    // address buyCurveAddress = _createStaticCurveLogic(address(0), "");
    // address sellCurveAddress = _createStaticCurveLogic(address(0), "");
    // address bondedTokenAddress = _createBondedToken(address(0), "");
    // address bondingCurveAddress = _createBondingCurve(address(0), "");
    // address dividendPoolAddress = _createDividendPool(address(0), "");

    // StaticCurveLogic(buyCurveAddress).initialize(buyCurveParams);
    // StaticCurveLogic(sellCurveAddress).initialize(sellCurveParams);
    // DividendPool(dividendPoolAddress).initialize(reserveToken);

    // BondedToken(bondedTokenAddress).initialize(
    //   bondedTokenName,
    //   bondedTokenSymbol,
    //   bondedTokenDecimals,
    //   bondingCurveAddress
    // );

    // BondingCurve(bondingCurveAddress).initialize(
    //   owner,
    //   beneficiary,
    //   reserveToken,
    //   BondedToken(bondedTokenAddress),
    //   ICurveLogic(buyCurveAddress),
    //   ICurveLogic(sellCurveAddress),
    //   DividendPool(dividendPoolAddress),
    //   splitOnPay
    // );

    // emit BondingCurveDeployed(
    //     bondingCurveAddress,
    //     bondedTokenAddress,
    //     buyCurveAddress,
    //     sellCurveAddress,
    //     dividendPoolAddress,
    //     msg.sender
    // );
  }
}
