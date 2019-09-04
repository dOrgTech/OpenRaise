pragma solidity ^0.5.7;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "@openzeppelin/upgrades/contracts/application/App.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/StandaloneERC20.sol";
import "./BondingCurveControlled.sol";
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
contract BondingCurveController is Initializable {
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

    function initialize(
        address staticCurveLogicImpl,
        address bancorCurveLogicImpl,
        address bondedTokenImpl,
        address bondingCurveImpl,
        address dividendPoolImpl,
        address bancorCurveServiceImpl,
    ) public initializer {
        _staticCurveLogicImpl = staticCurveLogicImpl;
        _bancorCurveLogicImpl = bancorCurveLogicImpl;
        _bondedTokenImpl = bondedTokenImpl;
        _bondingCurveImpl = bondingCurveImpl;
        _dividendPoolImpl = dividendPoolImpl;
        _bancorCurveServiceImpl = bancorCurveServiceImpl;
    }

    /* 
        Deployment
    */

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
        string memory bondedTokenName,
        string memory bondedTokenSymbol
    ) public {
        address[] memory proxies = new address[](5);

        proxies[0] = _createProxy(_staticCurveLogicImpl, address(0), "");
        proxies[1] = _createProxy(_staticCurveLogicImpl, address(0), "");
        proxies[2] = _createProxy(_bondedTokenImpl, address(0), "");
        proxies[3] = _createProxy(_bondingCurveImpl, address(0), "");
        proxies[4] = _createProxy(_dividendPoolImpl, address(0), "");

        StaticCurveLogic(proxies[0]).initialize(buyCurveParams);
        StaticCurveLogic(proxies[1]).initialize(sellCurveParams);
        BondedToken(proxies[2]).initialize(bondedTokenName, bondedTokenSymbol, 18, proxies[3]);
        DividendPool(proxies[4]).initialize(IERC20(collateralToken), owner);

        BondingCurveControlled(proxies[3]).initialize(
            owner,
            beneficiary,
            address(this),
            IERC20(collateralToken),
            BondedToken(proxies[2]),
            ICurveLogic(proxies[0]),
            ICurveLogic(proxies[1]),
            DividendPool(proxies[4]),
            splitOnPay
        );

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
        string memory bondedTokenName,
        string memory bondedTokenSymbol
    ) public {
        address[] memory proxies = new address[](5);

        proxies[0] = _createProxy(_bancorCurveLogicImpl, address(0), "");
        proxies[1] = _createProxy(_bancorCurveLogicImpl, address(0), "");
        proxies[2] = _createProxy(_bondedTokenImpl, address(0), "");
        proxies[3] = _createProxy(_bondingCurveImpl, address(0), "");
        proxies[4] = _createProxy(_dividendPoolImpl, address(0), "");

        BancorCurveLogic(proxies[0]).initialize(
            BancorCurveService(_bancorCurveServiceImpl),
            buyCurveParams
        );
        BancorCurveLogic(proxies[1]).initialize(
            BancorCurveService(_bancorCurveServiceImpl),
            sellCurveParams
        );
        BondedToken(proxies[2]).initialize(bondedTokenName, bondedTokenSymbol, 18, proxies[3]);
        DividendPool(proxies[4]).initialize(IERC20(collateralToken), owner);

        BondingCurveControlled(proxies[3]).initialize(
            owner,
            beneficiary,
            address(this),
            IERC20(collateralToken),
            BondedToken(proxies[2]),
            ICurveLogic(proxies[0]),
            ICurveLogic(proxies[1]),
            DividendPool(proxies[4]),
            splitOnPay
        );

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
            address dividendPoolImpl,
            address bancorCurveServiceImpl
        )
    {
        return (
            _staticCurveLogicImpl,
            _bancorCurveLogicImpl,
            _bondedTokenImpl,
            _bondingCurveImpl,
            _dividendPoolImpl,
            _bancorCurveServiceImpl
        );
    }

    /* 
        Bonding Curve Public
    */

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens. If zero, any price is allowed.
    /// @param recipient    Address to send the new bondedTokens to
    function buy(address curve, uint256 numTokens, uint256 maxPrice, address recipient)
        BondingCurveControlled bondingCurve = BondingCurveControlled(curve);
        IERC20 collateralToken = bondingCurve.collateralToken();

        uint256 buyPrice = bondingCurve.priceToBuy(numTokens);
        uint256 allowance = collateralToken.allowance(msg.sender, address(this));
        require(allowance > buyPrice, "Insufficent collateral token allowance");

        bondingCurve.buy(msg.sender, numTokens, maxPrice, recipient);
    {
    }

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send collateralTokens to
    function sell(address curve, uint256 numTokens, uint256 minPrice, address recipient) public {
        BondingCurveControlled bondingCurve = BondingCurveControlled(curve);
        BondedToken bondedToken = bondingCurve.bondedToken();

        uint256 balance = bondedToken.balanceOf(msg.sender);
        require(allowance > numTokens, "Insufficent bonded tokens");

        bondingCurve.sell(msg.sender, numTokens, maxPrice, recipient);
    }

    /// @notice             Pay the DAO in the specified payment token. They will be distributed between the DAO beneficiary and bonded token holders
    /// @dev                Does not currently support arbitrary token payments
    /// @param amount       The number of tokens to pay the DAO
    function pay(address curve, uint256 amount) public {
        BondingCurveControlled(curve).pay();
    }

    /* 
        Bonding Curve Admin
    */

    /// @notice Set beneficiary to a new address
    /// @param beneficiary       New beneficiary
    function setBeneficiary(address curve, address beneficiary) public onlyController {
        BondingCurveControlled(curve).setBeneficiary(msg.sender, beneficiary);
    }

    /// @notice Set buy curve to a new address
    /// @param buyCurve       New buy curve
    function setBuyCurve(address curve, ICurveLogic buyCurve) public onlyController {
        BondingCurveControlled(curve).setBuyCurve(msg.sender, buyCurve);
    }

    /// @notice Set sell curve to a new address
    /// @param sellCurve       New sell curve
    function setSellCurve(address curve, ICurveLogic sellCurve) public onlyController {
        BondingCurveControlled(curve).setSellCurve(msg.sender, sellCurve);
    }

    /// @notice Set split on pay to new value
    /// @param splitOnPay       New split on pay value
    function setSplitOnPay(address curve, uint256 splitOnPay) public onlyController {
        BondingCurveControlled(curve).setSplitOnPay(msg.sender, splitOnPay);
    }

}
