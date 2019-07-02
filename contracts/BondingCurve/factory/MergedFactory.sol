pragma solidity ^0.5.4;

import "./DividendTokenFactory.sol";
import "./BondingCurveFactory.sol";
import "./BancorCurveLogicFactory.sol";
import "../dividend/DividendToken.sol";
import "../interface/ICurveLogic.sol";

contract MergedFactory {

  event FundraisingDeployed(
    address indexed bondingCurve,
    address indexed dividendToken,
    address buyCurve,
    address sellCurve,
    address indexed sender
    );

    DividendTokenFactory dividendTokenFactory;
    BondingCurveFactory bondingCurveFactory;
    BancorCurveLogicFactory bancorCurveLogicFactory;

    constructor(
        address _bancorCurveLogicFactory,
        address _bondingCurveFactory,
        address _dividendTokenFactory
    ) public {
        bancorCurveLogicFactory = BancorCurveLogicFactory(_bancorCurveLogicFactory);
        bondingCurveFactory = BondingCurveFactory(_bondingCurveFactory);
        dividendTokenFactory = DividendTokenFactory(_dividendTokenFactory);
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
    bondingCurve = address(0);
    dividendToken = address(0);
    buyCurve = address(0);
    sellCurve = address(0);

    // buyCurve = bancorCurveLogicFactory.deploy(_buyParams);
    // sellCurve = bancorCurveLogicFactory.deploy(_sellParams);

    // dividendToken = dividendTokenFactory.deploy(
    //   _name,
    //   _symbol,
    //   _decimals,
    //   address(uint160(address(this))), //Cast to address payable
    //   _reserveToken,
    //   true
    // );

    // bondingCurve = bondingCurveFactory.deploy(
    //   _reserveToken,
    //   _beneficiary,
    //   buyCurve,
    //   sellCurve,
    //   _reserveToken,
    //   _splitOnPay
    // );

    // DividendToken(dividendToken).changeController(address(uint160(address(bondingCurve))));

    emit FundraisingDeployed(
      bondingCurve,
      dividendToken,
      buyCurve,
      sellCurve,
      msg.sender
    );

    return (
      bondingCurve,
      dividendToken,
      buyCurve,
      sellCurve
    );
  }
}
