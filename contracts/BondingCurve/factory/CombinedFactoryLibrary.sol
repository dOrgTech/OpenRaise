pragma solidity ^0.5.4;

import "./DividendTokenFactory.sol";
import "./BondingCurveFactory.sol";
import "./BancorCurveLogicFactory.sol";
import "../dividend/DividendToken.sol";
import "../interface/ICurveLogic.sol";

contract CombinedFactory {

//   event FundraisingDeployed(
//     address indexed bondingCurve,
//     address dividendToken,
//     address buyCurve,
//     address sellCurve
//     );

//   /// @notice Deploy a bonding curve with all new components.
//   /// @param _name Bonded token name.
//   /// @param _symbol Bonded token symbol.
//   /// @param _owner Owner of bonding curve.
//   /// @param _beneficiary Beneficiary of bonding curve.
//   /// @param _buyParams Bancor reserveRatio.
//   /// @param _sellParams Bancor reserveRatio.
//   /// @param _reserveToken Reserve token to buy Bonded tokens.
//   /// @param _splitOnPay Percentage allocated to beneficiary on revenue. The remainder is allocated to Bonded token holders.
//   function deploy(
//     string memory _name,
//     string memory _symbol,
//     address _owner,
//     address payable _beneficiary,
//     uint32 _buyParams,
//     uint32 _sellParams,
//     address _reserveToken,
//     uint _splitOnPay,
//     address _dividendTokenFactory,
//     address _bondingCurveFactory,
//     address _bancorCurveLogicFactory
//   ) public returns(
//     address bondingCurve,
//     address dividendToken,
//     address buyCurve,
//     address sellCurve
//   )
//   {
//     DividendTokenFactory  dividendTokenFactory = DividendTokenFactory(_dividendTokenFactory);
//     BondingCurveFactory bondingCurveFactory = BondingCurveFactory(_bondingCurveFactory);
//     BancorCurveLogicFactory bancorCurveLogicFactory = BancorCurveLogicFactory(_bancorCurveLogicFactory);

//     buyCurve = bancorCurveLogicFactory.deploy(_buyParams);
//     sellCurve = bancorCurveLogicFactory.deploy(_sellParams);

//     dividendToken = dividendTokenFactory.deploy(
//       _name,
//       _symbol,
//       18,
//       address(uint160(address(this))), //Cast to address payable
//       _reserveToken,
//       true
//     );

//     bondingCurve = bondingCurveFactory.deploy(
//       _reserveToken,
//       _beneficiary,
//       buyCurve,
//       sellCurve,
//       dividendToken,
//       _splitOnPay
//     );

//     DividendToken(dividendToken).changeController(address(uint160(address(bondingCurve))));

//     emit FundraisingDeployed(
//       address(bondingCurve),
//       address(dividendToken),
//       address(buyCurve),
//       address(sellCurve)
//     );

//     return (
//       bondingCurve,
//       dividendToken,
//       buyCurve,
//       sellCurve
//     );
//   }
}
