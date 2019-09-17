pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "@openzeppelin/upgrades/contracts/application/App.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "../BondingCurve.sol";
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
contract BondingCurveFactory is Initializable {
    address internal _staticCurveLogicImpl;
    address internal _bancorCurveLogicImpl;
    address internal _bondedTokenImpl;
    address internal _bondingCurveImpl;
    address internal _rewardsDistributorImpl;
    address internal _bancorCurveServiceImpl; //Must already be initialized

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
        address bancorCurveServiceImpl,
        address rewardsDistributorImpl
    ) public initializer {
        _staticCurveLogicImpl = staticCurveLogicImpl;
        _bancorCurveLogicImpl = bancorCurveLogicImpl;
        _bondedTokenImpl = bondedTokenImpl;
        _bondingCurveImpl = bondingCurveImpl;
        _rewardsDistributorImpl = rewardsDistributorImpl;
        _bancorCurveServiceImpl = bancorCurveServiceImpl;
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
        address owner,
        address beneficiary,
        address collateralToken,
        uint256 buyCurveParams,
        uint256 sellCurveParams,
        uint256 splitOnPay,
        string calldata bondedTokenName,
        string calldata bondedTokenSymbol
    ) external {
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
            proxies[3],  // minter is the BondingCurve
            RewardsDistributor(proxies[4]),
            IERC20(tempCollateral[0])
        );
        BondingCurve(proxies[3]).initialize(
            owner,
            beneficiary,
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
            msg.sender
        );
    }

    function deployBancor(
        address owner,
        address beneficiary,
        address collateralToken,
        uint32 buyCurveParams,
        uint32 sellCurveParams,
        uint256 splitOnPay,
        string calldata bondedTokenName,
        string calldata bondedTokenSymbol
    ) external {
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
            BancorCurveService(_bancorCurveServiceImpl),
            buyCurveParams
        );
        BancorCurveLogic(proxies[1]).initialize(
            BancorCurveService(_bancorCurveServiceImpl),
            sellCurveParams
        );
        BondedToken(proxies[2]).initialize(
            bondedTokenName,
            bondedTokenSymbol,
            18,
            proxies[3],  // minter is the BondingCurve
            RewardsDistributor(proxies[4]),
            IERC20(tempCollateral[0])
        );
        BondingCurve(proxies[3]).initialize(
            owner,
            beneficiary,
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
            msg.sender
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
            address bancorCurveServiceImpl
        )
    {
        return (
            _staticCurveLogicImpl,
            _bancorCurveLogicImpl,
            _bondedTokenImpl,
            _bondingCurveImpl,
            _rewardsDistributorImpl,
            _bancorCurveServiceImpl
        );
    }

}
