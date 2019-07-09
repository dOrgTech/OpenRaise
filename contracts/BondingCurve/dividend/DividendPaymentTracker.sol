pragma solidity ^0.5.4;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "../interface/IPaymentTracker.sol";
import "./DividendToken.sol";
import "zos-lib/contracts/Initializable.sol";

contract DividendPaymentTracker is Initializable, IPaymentTracker {
    using SafeMath for uint256;

    struct  Checkpoint {
        uint fromBlock; // `fromBlock` is the block number that the value was generated from
        uint value; // `value` is the amount of tokens at a specific block number
    }

    DividendToken dividendToken;
    IERC20 paymentToken;
    Checkpoint[] public payments;

    mapping (address => mapping (uint => bool)) public withdrawals;

    event Withdrawal(address indexed recipient, address indexed tokenAddr, uint256 amount);
    event PaymentRegistered(address indexed payee, address indexed tokenAddr, uint256 amount);

    function initialize(
        address _dividendTokenAddr,
        address _paymentTokenAddr
    ) public initializer {
        dividendToken = DividendToken(_dividendTokenAddr);
        paymentToken = IERC20(_paymentTokenAddr);
    }

    /// @notice Withdraw the available withdrawal allowance for the payments beginning and ending at the given indicies, inclusive.
    function withdraw(uint start, uint end) public {
        // require that the message sender holds at least one token
        require(dividendToken.balanceOf(msg.sender) > 0);

        // calculate the total amount available for withdrawal for the message sender, beginning and ending
        // at the given payment indicies
        uint withdrawalAmount = getWithdrawalAllowance(msg.sender, start, end);

        // require that the message sender has a positive withdrawal allowance
        require(withdrawalAmount > 0);

        // ensure contract has enough balance to make payment transfer
        require(paymentToken.balanceOf(address(this)) >= withdrawalAmount);

        //TODO: Is this insecure to re-entrancy? In any case it could be made nicer
        // transfer the total available amount to the message sender
        if (
            paymentToken.transfer(
                msg.sender,
                withdrawalAmount
            )
        ) {
            // mark the payment indices as withdrawn against
            for (uint i = start; i <= end; i++) {
                withdrawals[msg.sender][i] = true;
            }
        }

        emit Withdrawal(msg.sender, address(paymentToken), withdrawalAmount);
    }

    /// @notice Get the address of the singular token that payments are accepted from
    function getPaymentToken() public view returns (address) {
        return address(paymentToken);
    }

    /// @notice Returns the number of payments made so far
    function getNumberOfPaymentsMade() public view returns (uint numberOfPaymentsMade) {
        return payments.length;
    }

     /// @notice Returns the total withdrawal allowance of the given account, as accrued between the start and end payment indicies, inclusive.
    function getWithdrawalAllowance(address account, uint start, uint end) public view returns (uint totalWithdrawalAllowance) {
        require(start >= 0);

        require(end < payments.length);

        mapping (uint => bool) storage accountWithdrawals = withdrawals[account];

        for (uint i = start; i <= end; i++) {
            // if the account has already withdrawn against this payment index, continue
            if (accountWithdrawals[i]) {
                continue;
            }

            Checkpoint storage paymentCheckpoint = payments[i];

            uint paymentAmount = paymentCheckpoint.value;
            uint blockNumber = paymentCheckpoint.fromBlock;

            uint balanceAtBlockNumber = dividendToken.balanceOfAt(account, blockNumber);
            uint totalSupplyAtBlockNumber = dividendToken.totalSupplyAt(blockNumber);

            totalWithdrawalAllowance = totalWithdrawalAllowance
                .add(paymentAmount.mul(balanceAtBlockNumber).div(totalSupplyAtBlockNumber));
        }

        return totalWithdrawalAllowance;
    }

    /// @notice Registers a payment amount and block
    function _registerPayment(uint _paymentAmount) internal {
        // if tokens have not yet been minted, we reject the payment because we would not
        // be able to divide the payment into withdrawal allowances
        require(dividendToken.totalSupply() > 0, "Dividend token supply is 0");

        _updateValueAtNow(payments, _paymentAmount);
    }

    /// @dev `updateValueAtNow` used to update an array of Checkpoints
    /// @param checkpoints The history of data being updated
    /// @param _value The new number of tokens
    function _updateValueAtNow(Checkpoint[] storage checkpoints, uint _value
    ) internal  {
        if ((checkpoints.length == 0)
        || (checkpoints[checkpoints.length -1].fromBlock < block.number)) {
               Checkpoint storage newCheckPoint = checkpoints[ checkpoints.length++ ];
               newCheckPoint.fromBlock =  uint(block.number);
               newCheckPoint.value = uint(_value);
           } else {
               Checkpoint storage oldCheckPoint = checkpoints[checkpoints.length-1];
               oldCheckPoint.value = uint(_value);
           }
    }
}