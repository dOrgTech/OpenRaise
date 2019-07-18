pragma solidity >= 0.4.22 <6.0.0;

import "zos-lib/contracts/Initializable.sol";
// import "@statesauce/merkle-payments/contracts/PaymentPool.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";

/**
 * @title Dividend Payment Pool
 * @dev Allows withdrawals of allocated dividends by bonded token holders
 * Works with a single payment token
 */
contract DividendPool is Initializable {
    function initialize(IERC20 _paymentToken) public initializer {
        // PaymentPool.initialize(_paymentToken);
    }

}
