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
import "contracts/BondingCurve/curve/PolynomialCurveLogic.sol";
import "contracts/BondingCurve/dividend/RewardsDistributor.sol";
import "contracts/BondingCurve/token/BondedToken.sol";
import "contracts/BondingCurve/token/BondedTokenEther.sol";
import "contracts/BondingCurve/interface/ICurveLogic.sol";
import "contracts/BondingCurve/interface/IBondedToken.sol";

/**
 * @title Combined Factory
 * @dev Allows for the deploy of a Bonding Curve and supporting components in a single transaction
 * This was developed to simplify the deployment process for DAOs
 */
contract BondingCurveFactory is Initializable {
    address internal _staticCurveLogicImpl;
    address internal _bancorCurveLogicImpl;
    address internal _polynomialCurveLogicImpl;
    address internal _bondedTokenImpl;
    address internal _bondedTokenEtherImpl;
    address internal _bondingCurveImpl;
    address internal _bondingCurveEtherImpl;
    address internal _rewardsDistributorImpl;
    address internal _bancorCurveServiceImpl; //Must already be initialized

    enum CollateralTypes {Ether, ERC20}
    enum CurveTypes {Static, Bancor, Polynomial}

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
        address polynomialCurveLogicImpl,
        address bondedTokenImpl,
        address bondedTokenEtherImpl,
        address bondingCurveImpl,
        address bondingCurveEtherImpl,
        address rewardsDistributorImpl,
        address bancorCurveServiceImpl
    ) public initializer {
        _staticCurveLogicImpl = staticCurveLogicImpl;
        _bancorCurveLogicImpl = bancorCurveLogicImpl;
        _polynomialCurveLogicImpl = polynomialCurveLogicImpl;
        _bondedTokenImpl = bondedTokenImpl;
        _bondedTokenEtherImpl = bondedTokenEtherImpl;
        _bondingCurveImpl = bondingCurveImpl;
        _bondingCurveEtherImpl = bondingCurveEtherImpl;
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

    function _deployPolynomialCurveLogic() internal returns (address) {
        return _createProxy(_polynomialCurveLogicImpl, address(0), "");
    }

    function _deployBondedToken() internal returns (address) {
        return _createProxy(_bondedTokenImpl, address(0), "");
    }

    function _deployBondedTokenEther() internal returns (address) {
        return _createProxy(_bondedTokenEtherImpl, address(0), "");
    }

    function _deployBondingCurve() internal returns (address) {
        return _createProxy(_bondingCurveImpl, address(0), "");
    }

    function _deployBondingCurveEther() internal returns (address) {
        return _createProxy(_bondingCurveEtherImpl, address(0), "");
    }

    function _deployRewardsDistributor() internal returns (address) {
        return _createProxy(_rewardsDistributorImpl, address(0), "");
    }

    /* 
    Parameter Decoding
        deployParams
            [0]: Collateral Type
            [1]: Curve Type
        addressParams
            [0]: Owner
            [1]: Beneficiary
            [2]: Collateral Token
            [3]: Initial Bonded Token Holder
        uintParams
            [0]: buyCurveParams
            [1]: reservePercentage
            [2]: dividendPercentage
            [3]: Initial Bonded Token Supply (Pre-mint Amount)
        bondedTokenName
        bondedTokenSymbol
    */
    function deploy(
        uint256[] memory deployParams,
        address[] memory addressParams,
        uint256[] memory uintParams,
        string memory bondedTokenName,
        string memory bondedTokenSymbol
    ) public {
        address[] memory proxies = new address[](4);

        // Deploy Proxies
        if (deployParams[1] == uint256(CurveTypes.Static)) {
            proxies[0] = _deployStaticCurveLogic();
        } else if (deployParams[1] == uint256(CurveTypes.Bancor)) {
            proxies[0] = _deployBancorCurveLogic();
        } else if (deployParams[1] == uint256(CurveTypes.Polynomial)) {
            proxies[0] = _deployPolynomialCurveLogic();
        }

        if (deployParams[0] == uint256(CollateralTypes.Ether)) {
            proxies[1] = _deployBondedTokenEther();
            proxies[2] = _deployBondingCurveEther();
        } else if (deployParams[0] == uint256(CollateralTypes.ERC20)) {
            proxies[1] = _deployBondedToken();
            proxies[2] = _deployBondingCurve();
        }

        proxies[3] = _deployRewardsDistributor();

        // Initialize Proxies
        if (deployParams[1] == uint256(CurveTypes.Static)) {
            StaticCurveLogic(proxies[0]).initialize(uintParams[0]);
        } else if (deployParams[1] == uint256(CurveTypes.Bancor)) {
            BancorCurveLogic(proxies[0]).initialize(
                BancorCurveService(_bancorCurveServiceImpl),
                uint32(uintParams[0])
            );
        } else if (deployParams[1] == uint256(CurveTypes.Polynomial)) {
            PolynomialCurveLogic(proxies[0]).initialize(uint8(uintParams[0]));
        }

        if (deployParams[0] == uint256(CollateralTypes.Ether)) {
            BondedTokenEther(proxies[1]).initialize(
                bondedTokenName,
                bondedTokenSymbol,
                18,
                proxies[2], // minter is the BondingCurve
                addressParams[3],
                uintParams[3],
                RewardsDistributor(proxies[3])
            );
            BondingCurveEther(proxies[2]).initialize(
                addressParams[0],
                addressParams[1],
                IBondedToken(proxies[1]),
                ICurveLogic(proxies[0]),
                uintParams[1],
                uintParams[2],
                uintParams[3]
            );
        } else if (deployParams[0] == uint256(CollateralTypes.ERC20)) {
            BondedToken(proxies[1]).initialize(
                bondedTokenName,
                bondedTokenSymbol,
                18,
                proxies[2], // minter is the BondingCurve
                addressParams[3],
                uintParams[3],
                RewardsDistributor(proxies[3]),
                IERC20(addressParams[2])
            );
            BondingCurve(proxies[2]).initialize(
                addressParams[0],
                addressParams[1],
                IERC20(addressParams[2]),
                IBondedToken(proxies[1]),
                ICurveLogic(proxies[0]),
                uintParams[1],
                uintParams[2],
                uintParams[3]
            );
        }

        RewardsDistributor(proxies[3]).initialize(proxies[1]);

        emit BondingCurveDeployed(proxies[2], proxies[1], proxies[0], proxies[3], msg.sender);
    }
    function getImplementations()
        public
        view
        returns (
            address staticCurveLogicImpl,
            address bancorCurveLogicImpl,
            address polynomialCurveLogicImpl,
            address bondedTokenImpl,
            address bondedTokenEtherImpl,
            address bondingCurveImpl,
            address bondingCurveEtherImpl,
            address rewardsDistributorImpl,
            address bancorCurveServiceImpl
        )
    {
        return (
            _staticCurveLogicImpl,
            _bancorCurveLogicImpl,
            _polynomialCurveLogicImpl,
            _bondedTokenImpl,
            _bondedTokenEtherImpl,
            _bondingCurveImpl,
            _bondingCurveEtherImpl,
            _rewardsDistributorImpl,
            _bancorCurveServiceImpl
        );
    }

}
