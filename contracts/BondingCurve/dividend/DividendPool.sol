pragma solidity ^0.5.7;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "@statesauce/merkle-payments/contracts/PaymentPool.sol";

/**
 * @title Dividend Payment Pool
 * @dev Allows withdrawals of allocated dividends by bonded token holders
 * Works with a single payment token
 */
contract DividendPool is Initializable, PaymentPool {

    /// @dev Initialize contract
    /// @param paymentToken Token to recieve and track payments.
    /// @param owner Contract owner. Has exclusive rights to upload new merkle roots.
    function initialize(IERC20 paymentToken, address owner) public initializer {
        PaymentPool.initialize(paymentToken, owner);
    }
}