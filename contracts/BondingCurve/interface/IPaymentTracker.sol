pragma solidity ^0.5.0;

/// @title  PaymentTracker - tracks payments and withdrawals for holders of an associated dividend token
contract IPaymentTracker {
    /// @notice Recieve Payment Tokens and register payment.
    function pay(uint amount) public;

    /// @notice Withdraw the available withdrawal allowance for the payments beginning and ending at the given indicies, inclusive.
    function withdraw(uint start, uint end) public;

    /// @notice Get the address of the singular token that payments are accepted from
    function getPaymentToken() public view returns (address);

    /// @notice Returns the number of payments made so far
    function getNumberOfPaymentsMade() public view returns (uint numberOfPaymentsMade);

     /// @notice Returns the total withdrawal allowance of the given account, as accrued between the start and end payment indicies, inclusive.
    function getWithdrawalAllowance(address account, uint start, uint end) public view returns (uint totalWithdrawalAllowance);
}