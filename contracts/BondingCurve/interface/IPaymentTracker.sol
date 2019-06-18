pragma solidity ^0.5.0;

/// @title  PaymentTracker - tracks payments and withdrawals for holders of an associated dividend token
interface IPaymentTracker {
    /// @notice Withdraw the available withdrawal allowance for the payments beginning and ending at the given indicies, inclusive.
    function withdraw(uint start, uint end) external;

    /// @notice Get the address of the singular token that payments are accepted from
    function getPaymentToken() external view returns (address);

    /// @notice Returns the number of payments made so far
    function getNumberOfPaymentsMade() external view returns (uint numberOfPaymentsMade);

     /// @notice Returns the total withdrawal allowance of the given account, as accrued between the start and end payment indicies, inclusive.
    function getWithdrawalAllowance(address account, uint start, uint end) external view returns (uint totalWithdrawalAllowance);
}