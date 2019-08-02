pragma solidity ^0.5.4;
pragma experimental ABIEncoderV2;

import "zos-lib/contracts/Initializable.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "zos-lib/contracts/application/App.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/StandaloneERC20.sol";
import "../BondingCurve.sol";
import "../curve/BancorCurveLogic.sol";
import "../curve/BancorCurveService.sol";
import "../curve/StaticCurveLogic.sol";
import "../dividend/DividendPool.sol";
import "../token/BondedToken.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Combined Factory
 * @dev Allows for the deploy of a Bonding Curve and supporting components in a single transaction
 * This was developed to simplify the deployment process for DAOs
 */
contract BondingCurveFactory is Initializable {

    struct DeployParams {
      address beneficiary;
      address owner;
      uint256 buyCurveParams;
      uint256 sellCurveParams;
      address collateralToken;
      uint splitOnPay;
      string bondedTokenName;
      string bondedTokenSymbol;
    }

    struct DeployBancorParams {
      address beneficiary;
      address owner;
      uint32 buyCurveParams;
      uint32 sellCurveParams;
      address collateralToken;
      uint splitOnPay;
      string bondedTokenName;
      string bondedTokenSymbol;
    }

    address internal _staticCurveLogicImpl;
    address internal _bancorCurveLogicImpl;
    address internal _bondedTokenImpl;
    address internal _bondingCurveImpl;
    address internal _dividendPoolImpl;
    address internal _bancorCurveServiceImpl; //Must already be initialized

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
        address dividendPoolImpl,
        address bancorCurveServiceImpl
    ) public initializer {
      _staticCurveLogicImpl = staticCurveLogicImpl;
      _bancorCurveLogicImpl = bancorCurveLogicImpl;
      _bondedTokenImpl = bondedTokenImpl;
      _bondingCurveImpl = bondingCurveImpl;
      _dividendPoolImpl = dividendPoolImpl;
      _bancorCurveServiceImpl = bancorCurveServiceImpl;
    }

    function _createProxy(address implementation, address admin, bytes memory data) internal returns (address proxy) {
        AdminUpgradeabilityProxy proxy = new AdminUpgradeabilityProxy(implementation, admin, data);
        emit ProxyCreated(address(proxy));
        return address(proxy);
    }

  function deploy(
    DeployParams memory deployParams
  ) public
    // returns(address buyCurve, address sellCurve, address bondedToken, address bondingCurve, address dividendPool) 
    {
    address buyCurve = _createProxy(_staticCurveLogicImpl, address(0), "");
    address sellCurve = _createProxy(_staticCurveLogicImpl, address(0), "");
    address bondedToken = _createProxy(_bondedTokenImpl, address(0), "");
    address bondingCurve = _createProxy(_bondingCurveImpl, address(0), "");
    address dividendPool = _createProxy(_dividendPoolImpl, address(0), "");

    StaticCurveLogic(buyCurve).initialize(deployParams.buyCurveParams);
    StaticCurveLogic(sellCurve).initialize(deployParams.sellCurveParams);
    BondedToken(bondedToken).initialize(deployParams.bondedTokenName, deployParams.bondedTokenSymbol, 18, bondingCurve);
    DividendPool(dividendPool).initialize(IERC20(deployParams.collateralToken), deployParams.owner);

    BondingCurve(bondingCurve).initialize(
        deployParams.owner,
        deployParams.beneficiary,
        IERC20(deployParams.collateralToken),
        BondedToken(bondedToken),
        ICurveLogic(buyCurve),
        ICurveLogic(sellCurve),
        DividendPool(dividendPool),
        deployParams.splitOnPay
    );

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
      address dividendPoolImpl,
      address bancorCurveServiceImpl
    ) {
    return (
        _staticCurveLogicImpl,
        _bancorCurveLogicImpl,
        _bondedTokenImpl,
        _bondingCurveImpl,
        _dividendPoolImpl,
        _bancorCurveServiceImpl
    );
  }

  function deployBancor(
    DeployBancorParams memory deployParams
  ) public
    // returns(address buyCurve, address sellCurve, address bondedToken, address bondingCurve, address dividendPool) 
    {
    address buyCurve = _createProxy(_bancorCurveLogicImpl, address(0), "");
    address sellCurve = _createProxy(_bancorCurveLogicImpl, address(0), "");
    address bondedToken = _createProxy(_bondedTokenImpl, address(0), "");
    address bondingCurve = _createProxy(_bondingCurveImpl, address(0), "");
    address dividendPool = _createProxy(_dividendPoolImpl, address(0), "");

    // TODO: require(_bancorCurveServiceImpl.isInitialized())

    BancorCurveLogic(buyCurve).initialize(BancorCurveService(_bancorCurveServiceImpl), deployParams.buyCurveParams);
    BancorCurveLogic(sellCurve).initialize(BancorCurveService(_bancorCurveServiceImpl), deployParams.sellCurveParams);
    BondedToken(bondedToken).initialize(deployParams.bondedTokenName, deployParams.bondedTokenSymbol, 18, bondingCurve);
    DividendPool(dividendPool).initialize(IERC20(deployParams.collateralToken), deployParams.owner);

    BondingCurve(bondingCurve).initialize(
        deployParams.owner,
        deployParams.beneficiary,
        IERC20(deployParams.collateralToken),
        BondedToken(bondedToken),
        ICurveLogic(buyCurve),
        ICurveLogic(sellCurve),
        DividendPool(dividendPool),
        deployParams.splitOnPay
    );

    emit BondingCurveDeployed(
        bondingCurve,
        bondedToken,
        buyCurve,
        sellCurve,
        dividendPool,
        msg.sender
    );
  }

}
