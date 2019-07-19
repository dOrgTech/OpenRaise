pragma solidity ^0.5.4;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
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
contract TestFactory is Initializable {

    address internal _staticCurveLogicImpl;
    address internal _bancorCurveLogicImpl;
    address internal _bondedTokenImpl;
    address internal _bondingCurveImpl;
    address internal _dividendPoolImpl;

    event ProxyCreated(address proxy);

    event BondingCurveDeployed(
        address indexed bondingCurve,
        address indexed bondedToken,
        address buyCurve,
        address sellCurve,
        address dividendPool,
        address indexed sender
    );

    function initialize (
        address staticCurveLogicImpl,
        address bancorCurveLogicImpl,
        address bondedTokenImpl,
        address bondingCurveImpl,
        address dividendPoolImpl
    ) public initializer {
      _staticCurveLogicImpl = staticCurveLogicImpl;
      _bancorCurveLogicImpl = bancorCurveLogicImpl;
      _bondedTokenImpl = bondedTokenImpl;
      _bondingCurveImpl = bondingCurveImpl;
      _dividendPoolImpl = dividendPoolImpl;
    }

    function _createProxy(address implementation, address admin, bytes memory data) internal returns (address proxy) {
        AdminUpgradeabilityProxy proxy = new AdminUpgradeabilityProxy(implementation, admin, data);
        emit ProxyCreated(address(proxy));
        return address(proxy);
    }

  function deploy(
    address beneficiary,
    address owner,
    uint256 buyCurveParams,
    uint256 sellCurveParams,
    IERC20 collateralToken,
    uint splitOnPay,
    string memory bondedTokenName,
    string memory bondedTokenSymbol
  ) public 
    // returns(address buyCurve, address sellCurve, address bondedToken, address bondingCurve, address dividendPool) 
    {

    address buyCurve = _createProxy(_staticCurveLogicImpl, address(0), "");
    address sellCurve = _createProxy(_staticCurveLogicImpl, address(0), "");
    address bondedToken = _createProxy(_bondedTokenImpl, address(0), "");
    address bondingCurve = _createProxy(_bondingCurveImpl, address(0), "");
    address dividendPool = _createProxy(_dividendPoolImpl, address(0), "");

    StaticCurveLogic(buyCurve).initialize(buyCurveParams);
    StaticCurveLogic(sellCurve).initialize(sellCurveParams);
    BondedToken(bondedToken).initialize(bondedTokenName, bondedTokenSymbol, 18, bondingCurve);
    DividendPool(dividendPool).initialize(collateralToken, owner);

    // BondingCurve(bondingCurve).initialize(
    //     owner,
    //     beneficiary,
    //     collateralToken,
    //     BondedToken(bondedToken),
    //     ICurveLogic(buyCurve),
    //     ICurveLogic(sellCurve),
    //     DividendPool(dividendPool),
    //     splitOnPay
    // );

    emit BondingCurveDeployed(
        bondingCurve,
        bondedToken,
        buyCurve,
        sellCurve,
        dividendPool,
        msg.sender
    );
  }

  function getImplementations() public view returns(
      address staticCurveLogicImpl,
      address bancorCurveLogicImpl,
      address bondedTokenImpl,
      address bondingCurveImpl,
      address dividendPoolImpl
    ) {
    return (
        _staticCurveLogicImpl,
        _bancorCurveLogicImpl,
        _bondedTokenImpl,
        _bondingCurveImpl,
        _dividendPoolImpl
    );
  }

}
