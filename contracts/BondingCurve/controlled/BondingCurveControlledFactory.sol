pragma solidity ^0.5.7;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "@openzeppelin/upgrades/contracts/application/App.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "./BondingCurveControlled.sol";
import "../access/ControllerRole.sol";
import "../curve/BancorCurveLogic.sol";
import "../curve/BancorCurveService.sol";
import "../curve/StaticCurveLogic.sol";
import "../dividend/RewardsDistributor.sol";
import "../token/BondedToken.sol";
import "../interface/ICurveLogic.sol";

/**
 * @title Combined Factory
 * @dev Allows for the deploy of a Bonding Curve and supporting components in a single transaction
 * This was developed to simplify the deployment process for DAOs
 */
contract BondingCurveControlledFactory is Initializable, ControllerRole {
    address internal _staticCurveLogicImpl;
    address internal _bancorCurveLogicImpl;
    address internal _bondedTokenImpl;
    address internal _bondingCurveImpl;
    address internal _rewardsDistributorImpl;
    address internal _bancorCurveService; //Must already be initialized
    address internal _bondingCurveController;

    event ProxyCreated(address proxy);

    event BondingCurveDeployed(
        address indexed bondingCurve,
        address indexed bondedToken,
        address buyCurve,
        address sellCurve,
        address rewardsDistributor,
        address indexed sender
    );

    function initialize(
        address staticCurveLogicImpl,
        address bancorCurveLogicImpl,
        address bondedTokenImpl,
        address bondingCurveImpl,
        address bancorCurveService,
        address rewardsDistributorImpl,
        address bondingCurveController
    ) public initializer {
        _staticCurveLogicImpl = staticCurveLogicImpl;
        _bancorCurveLogicImpl = bancorCurveLogicImpl;
        _bondedTokenImpl = bondedTokenImpl;
        _bondingCurveImpl = bondingCurveImpl;
        _rewardsDistributorImpl = rewardsDistributorImpl;
        _bancorCurveService = bancorCurveService;
        _bondingCurveController = bondingCurveController;

        ControllerRole.initialize(bondingCurveController);
    }

    function _createProxy(address implementation, address admin, bytes memory data)
        internal
        returns (address proxy)
    {
        AdminUpgradeabilityProxy proxy = new AdminUpgradeabilityProxy(implementation, admin, data);
        emit ProxyCreated(address(proxy));
        return address(proxy);
    }

    function deployStatic(
        address sender,
        address owner,
        address beneficiary,
        address collateralToken,
        uint256 buyCurveParams,
        uint256 sellCurveParams,
        uint256 splitOnPay,
        string memory bondedTokenName,
        string memory bondedTokenSymbol
    ) public {
        address[] memory proxies = new address[](5);
        address[] memory tempCollateral = new address[](1);

        // Hack to avoid "Stack Too Deep" error
        tempCollateral[0] = collateralToken;

        proxies[0] = _createProxy(_staticCurveLogicImpl, address(0), "");
        proxies[1] = _createProxy(_staticCurveLogicImpl, address(0), "");
        proxies[2] = _createProxy(_bondedTokenImpl, address(0), "");
        proxies[3] = _createProxy(_bondingCurveImpl, address(0), "");
        proxies[4] = _createProxy(_rewardsDistributorImpl, address(0), "");

        StaticCurveLogic(proxies[0]).initialize(buyCurveParams);
        StaticCurveLogic(proxies[1]).initialize(sellCurveParams);
        BondedToken(proxies[2]).initialize(
            bondedTokenName,
            bondedTokenSymbol,
            18,
            proxies[3], // minter is the BondingCurve
            RewardsDistributor(proxies[4]),
            IERC20(tempCollateral[0])
        );
        BondingCurveControlled(proxies[3]).initialize(
            owner,
            beneficiary,
            _bondingCurveController,
            IERC20(collateralToken),
            BondedToken(proxies[2]),
            ICurveLogic(proxies[0]),
            ICurveLogic(proxies[1]),
            splitOnPay
        );
        RewardsDistributor(proxies[4]).initialize(proxies[2]);

        emit BondingCurveDeployed(
            proxies[3],
            proxies[2],
            proxies[0],
            proxies[1],
            proxies[4],
            sender
        );
    }

    function deployBancor(
        address sender,
        address owner,
        address beneficiary,
        address collateralToken,
        uint32 buyCurveParams,
        uint32 sellCurveParams,
        uint256 splitOnPay,
        string memory bondedTokenName,
        string memory bondedTokenSymbol
    ) public {
        address[] memory proxies = new address[](5);
        address[] memory tempCollateral = new address[](1);

        // Hack to avoid "Stack Too Deep" error
        tempCollateral[0] = collateralToken;

        proxies[0] = _createProxy(_bancorCurveLogicImpl, address(0), "");
        proxies[1] = _createProxy(_bancorCurveLogicImpl, address(0), "");
        proxies[2] = _createProxy(_bondedTokenImpl, address(0), "");
        proxies[3] = _createProxy(_bondingCurveImpl, address(0), "");
        proxies[4] = _createProxy(_rewardsDistributorImpl, address(0), "");

        BancorCurveLogic(proxies[0]).initialize(
            BancorCurveService(_bancorCurveService),
            buyCurveParams
        );
        BancorCurveLogic(proxies[1]).initialize(
            BancorCurveService(_bancorCurveService),
            sellCurveParams
        );
        BondedToken(proxies[2]).initialize(
            bondedTokenName,
            bondedTokenSymbol,
            18,
            proxies[3], // minter is the BondingCurve
            RewardsDistributor(proxies[4]),
            IERC20(tempCollateral[0])
        );
        BondingCurveControlled(proxies[3]).initialize(
            owner,
            beneficiary,
            _bondingCurveController,
            IERC20(collateralToken),
            BondedToken(proxies[2]),
            ICurveLogic(proxies[0]),
            ICurveLogic(proxies[1]),
            splitOnPay
        );
        RewardsDistributor(proxies[4]).initialize(proxies[2]);

        emit BondingCurveDeployed(
            proxies[3],
            proxies[2],
            proxies[0],
            proxies[1],
            proxies[4],
            sender
        );
    }

    function getImplementations()
        public
        view
        returns (
            address staticCurveLogicImpl,
            address bancorCurveLogicImpl,
            address bondedTokenImpl,
            address bondingCurveImpl,
            address rewardsDistributorImpl,
            address bancorCurveService,
            address bondingCurveController
        )
    {
        return (
            _staticCurveLogicImpl,
            _bancorCurveLogicImpl,
            _bondedTokenImpl,
            _bondingCurveImpl,
            _rewardsDistributorImpl,
            _bancorCurveService,
            _bondingCurveController
        );
    }

}
