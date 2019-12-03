pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "@openzeppelin/upgrades/contracts/application/App.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "contracts/BondingCurve/BondingCurve.sol";
import "contracts/BondingCurve/BondingCurveEther.sol";
import "contracts/BondingCurve/curve/BancorCurveLogic.sol";
import "contracts/BondingCurve/curve/BancorCurveService.sol";
import "contracts/BondingCurve/curve/StaticCurveLogic.sol";
import "contracts/BondingCurve/dividend/RewardsDistributor.sol";
import "contracts/BondingCurve/token/BondedToken.sol";
import "contracts/BondingCurve/interface/ICurveLogic.sol";

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
    returns (address)
    {
        AdminUpgradeabilityProxy proxy = new AdminUpgradeabilityProxy(implementation, admin, data);
        emit ProxyCreated(address(proxy));
        return address(proxy);
    }

    function _deployStaticCurveLogic() internal returns (address) {
        return _createProxy(_staticCurveLogicImpl, address(0), "");
    }

    function _deployBancorCurveLogic() internal returns (address) {
        return _createProxy(_staticCurveLogicImpl, address(0), "");
    }

    function _deployBondedToken() internal returns (address) {
        return _createProxy(_bondedTokenImpl, address(0), "");
    }

    function _deployBondingCurve() internal returns (address) {
        return _createProxy(_bondingCurveImpl, address(0), "");
    }

    function _deployRewardsDistributor() internal returns (address) {
        return _createProxy(_rewardsDistributorImpl, address(0), "");
    }

    function deployStaticEther(
        address owner,
        address beneficiary,
        uint256 buyCurveParams,
        uint256 reservePercentage,
        uint256 dividendPercentage,
        string calldata bondedTokenName,
        string calldata bondedTokenSymbol
    ) external {
        address[] memory proxies = new address[](4);

        proxies[0] = _deployStaticCurveLogic();
        proxies[1] = _deployBondedToken();
        proxies[2] = _deployBondingCurve();
        proxies[3] = _deployRewardsDistributor();

        StaticCurveLogic(proxies[0]).initialize(buyCurveParams);
        BondedToken(proxies[1]).initialize(
            bondedTokenName,
            bondedTokenSymbol,
            18,
            proxies[2], // minter is the BondingCurve
            RewardsDistributor(proxies[3])
        );
        BondingCurveEther(proxies[2]).initialize(
            owner,
            beneficiary,
            BondedToken(proxies[1]),
            ICurveLogic(proxies[0]),
            reservePercentage,
            dividendPercentage
        );
        RewardsDistributor(proxies[3]).initialize(proxies[1]);

        emit BondingCurveDeployed(proxies[2], proxies[1], proxies[0], proxies[3], msg.sender);
    }

    function deployStaticERC20(
        address owner,
        address beneficiary,
        address collateralToken,
        uint256 buyCurveParams,
        uint256 reservePercentage,
        uint256 dividendPercentage,
        string calldata bondedTokenName,
        string calldata bondedTokenSymbol
    ) external {
        address[] memory proxies = new address[](4);
        address[] memory tempCollateral = new address[](1);

        // Hack to avoid "Stack Too Deep" error
        tempCollateral[0] = collateralToken;

        proxies[0] = _deployStaticCurveLogic();
        proxies[1] = _deployBondedToken();
        proxies[2] = _deployBondingCurve();
        proxies[3] = _deployRewardsDistributor();

        StaticCurveLogic(proxies[0]).initialize(buyCurveParams);
        BondedToken(proxies[1]).initialize(
            bondedTokenName,
            bondedTokenSymbol,
            18,
            proxies[2], // minter is the BondingCurve
            RewardsDistributor(proxies[3]),
            IERC20(tempCollateral[0])
        );
        BondingCurve(proxies[2]).initialize(
            owner,
            beneficiary,
            IERC20(collateralToken),
            BondedToken(proxies[1]),
            ICurveLogic(proxies[0]),
            reservePercentage,
            dividendPercentage
        );
        RewardsDistributor(proxies[3]).initialize(proxies[1]);

        emit BondingCurveDeployed(proxies[2], proxies[1], proxies[0], proxies[3], msg.sender);
    }

    function deployBancorERC20(
        address owner,
        address beneficiary,
        address collateralToken,
        uint32 buyCurveParams,
        uint256 reservePercentage,
        uint256 dividendPercentage,
        string calldata bondedTokenName,
        string calldata bondedTokenSymbol
    ) external {
        address[] memory proxies = new address[](4);
        address[] memory tempCollateral = new address[](1);

        // Hack to avoid "Stack Too Deep" error
        tempCollateral[0] = collateralToken;

        proxies[0] = _deployBancorCurveLogic();
        proxies[1] = _deployBondedToken();
        proxies[2] = _deployBondingCurve();
        proxies[3] = _deployRewardsDistributor();

        BancorCurveLogic(proxies[0]).initialize(
            BancorCurveService(_bancorCurveServiceImpl),
            buyCurveParams
        );

        BondedToken(proxies[1]).initialize(
            bondedTokenName,
            bondedTokenSymbol,
            18,
            proxies[2], // minter is the BondingCurve
            RewardsDistributor(proxies[3]),
            IERC20(tempCollateral[0])
        );

    BondingCurve(proxies[2]).initialize(
            owner,
            beneficiary,
            IERC20(collateralToken),
            BondedToken(proxies[1]),
            ICurveLogic(proxies[0]),
            reservePercentage,
            dividendPercentage
        );
        RewardsDistributor(proxies[3]).initialize(proxies[1]);

        emit BondingCurveDeployed(proxies[2], proxies[1], proxies[0], proxies[3], msg.sender);
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
