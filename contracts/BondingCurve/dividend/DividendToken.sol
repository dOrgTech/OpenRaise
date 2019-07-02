pragma solidity ^0.5.0;

// External dependencies.
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Controlled.sol";

contract ApproveAndCallFallBack {
    function receiveApproval(address from, uint256 _amount, address _token, bytes memory _data) public;
}

/// Much structure taken from Giveth's MiniMeToken: https://github.com/Giveth/minime
contract DividendToken is Controlled, IERC20 {
    using SafeMath for uint;

    /// @dev `Checkpoint` is the structure that attaches a block number to a
    ///  given value, the block number attached is the one that last changed the
    ///  value
    struct  Checkpoint {

        // `fromBlock` is the block number that the value was generated from
        uint fromBlock;

        // `value` is the amount of tokens at a specific block number
        uint value;
    }

    string public name;                //The Token's name: e.g. DigixDAO Tokens
    uint8 public decimals;             //Number of decimals of the smallest unit
    string public symbol;              //An identifier: e.g. REP

    Checkpoint[] public payments;

    IERC20 paymentToken;

    // keeps track of how much has been withdrawn from each address;
    // the inner mapping is of payment index to whether or not the payment index has been withdrawn against
    mapping (address => mapping (uint => bool)) public withdrawals;

    // `balances` is the map that tracks the balance of each address, in this
    //  contract when the balance changes the block number that the change
    //  occurred is also included in the map
    mapping (address => Checkpoint[]) balances;

    // `allowed` tracks any extra transfer rights as in all ERC20 tokens
    mapping (address => mapping (address => uint256)) allowed;

    // Tracks the history of the `totalSupply` of the token
    Checkpoint[] totalSupplyHistory;

    // Flag that determines if the token is transferable or not.
    bool public transfersEnabled;

    string public constant SUPPLY_IS_ZERO = "SUPPLY_IS_ZERO";
    
////////////////
// Events
////////////////
    event ClaimedTokens(address indexed token, address indexed controller, uint value);
    event ClaimedEther(address indexed controller, uint value);
////////////////
// Constructor
////////////////

    /// @notice Constructor to create a DividendToken
    /// @param _transfersEnabled If true, tokens will be able to be transferred
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address payable _controller,
        address _paymentToken,
        bool _transfersEnabled
    )
        public
        Controlled(_controller)
    {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        paymentToken = IERC20(_paymentToken);
        transfersEnabled = _transfersEnabled;
    }

///////////////////
// DividendToken Methods
///////////////////

    /**
     * Registers a payment amount and block
     */
    function registerPayment(
        uint _paymentAmount
    )
        external
        onlyController
    {
        // if tokens have not yet been minted, we reject the payment because we would not
        // be able to divide the payment into withdrawal allowances
        require(totalSupply() > 0, SUPPLY_IS_ZERO);

        updateValueAtNow(payments, _paymentAmount);
    }

    /**
     * Withdraw the available withdrawal allowance for the payments beginning and ending at the
     * given indicies, inclusive.
     */
    function withdraw(
        uint start,
        uint end
    )
        external
    {
        // require that the message sender holds at least one token
        require(balanceOf(msg.sender) > 0);

        // calculate the total amount available for withdrawal for the message sender, beginning and ending
        // at the given payment indicies
        uint withdrawalAmount = getWithdrawalAllowance(msg.sender, start, end);

        // require that the message sender has a positive withdrawal allowance
        require(withdrawalAmount > 0);

        // ensure contract has enough balance to make payment transfer
        require(paymentToken.balanceOf(address(this)) >= withdrawalAmount);

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
    }
    
    function getPaymentToken() public view returns (address) {
        return address(paymentToken);
    }

    /**
     * Returns the number of payments made so far
     */
    function getNumberOfPaymentsMade(
    )
        public
        view
        returns (uint numberOfPaymentsMade)
    {
        return payments.length;
    }

    /**
     * Returns the total withdrawal allowance of the given account, as accrued between the start and end payment
     * indicies, inclusive.
     */
    function getWithdrawalAllowance(
        address account,
        uint start,
        uint end
    )
        public
        view
        returns (uint totalWithdrawalAllowance)
    {
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

            uint balanceAtBlockNumber = balanceOfAt(account, blockNumber);
            uint totalSupplyAtBlockNumber = totalSupplyAt(blockNumber);

            totalWithdrawalAllowance = totalWithdrawalAllowance
                .add(paymentAmount.mul(balanceAtBlockNumber).div(totalSupplyAtBlockNumber));
        }

        return totalWithdrawalAllowance;
    }

///////////////////
// ERC20 Methods
///////////////////

    /// @notice Send `_amount` tokens to `_to` from `msg.sender`
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _amount) public returns (bool success) {
        require(transfersEnabled);
        return doTransfer(msg.sender, _to, _amount);
    }

    /// @notice Send `_amount` tokens to `_to` from `_from` on the condition it
    ///  is approved by `_from`
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function transferFrom(address _from, address _to, uint256 _amount
    ) public returns (bool success) {

        // The controller of this contract can move tokens around at will,
        //  this is important to recognize! Confirm that you trust the
        //  controller of this contract, which in most situations should be
        //  another open source smart contract or 0x0
        if (msg.sender != controller) {
            require(transfersEnabled);

            // The standard ERC 20 transferFrom functionality
            if (allowed[_from][msg.sender] < _amount) return false;
            allowed[_from][msg.sender] -= _amount;
        }
        return doTransfer(_from, _to, _amount);
    }

    /// @dev This is the actual transfer function in the token contract, it can
    ///  only be called by other functions in this contract.
    /// @param _from The address holding the tokens being transferred
    /// @param _to The address of the recipient
    /// @param _amount The amount of tokens to be transferred
    /// @return True if the transfer was successful
    function doTransfer(address _from, address _to, uint _amount
    ) internal returns(bool) {

           if (_amount == 0) {
               return true;
           }

           // Do not allow transfer to 0x0 or the token contract itself
           require((_to != address(0)) && (_to != address(this)));

           // If the amount being transfered is more than the balance of the
           //  account the transfer returns false
           uint256 previousBalanceFrom = balanceOfAt(_from, block.number);
           if (previousBalanceFrom < _amount) {
               return false;
           }

           // First update the balance array with the new value for the address
           //  sending the tokens
           updateValueAtNow(balances[_from], previousBalanceFrom - _amount);

           // Then update the balance array with the new value for the address
           //  receiving the tokens
           uint256 previousBalanceTo = balanceOfAt(_to, block.number);
           require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
           updateValueAtNow(balances[_to], previousBalanceTo + _amount);

           // An event to make the transfer easy to find on the blockchain
           emit Transfer(_from, _to, _amount);

           return true;
    }

    /// @param _owner The address that's balance is being requested
    /// @return The balance of `_owner` at the current block
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balanceOfAt(_owner, block.number);
    }

    /// @notice `msg.sender` approves `_spender` to spend `_amount` tokens on
    ///  its behalf. This is a modified version of the ERC20 approve function
    ///  to be a little bit safer
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _amount The amount of tokens to be approved for transfer
    /// @return True if the approval was successful
    function approve(address _spender, uint256 _amount) public returns (bool success) {
        require(transfersEnabled);

        // To change the approve amount you first have to reduce the addresses`
        //  allowance to zero by calling `approve(_spender,0)` if it is not
        //  already 0 to mitigate the race condition described here:
        //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        require((_amount == 0) || (allowed[msg.sender][_spender] == 0));

        allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    /// @dev This function makes it easy to read the `allowed[]` map
    /// @param _owner The address of the account that owns the token
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens of _owner that _spender is allowed
    ///  to spend
    function allowance(address _owner, address _spender
    ) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    /// @notice `msg.sender` approves `_spender` to send `_amount` tokens on
    ///  its behalf, and then a function is triggered in the contract that is
    ///  being approved, `_spender`. This allows users to use their tokens to
    ///  interact with contracts in one function call instead of two
    /// @param _spender The address of the contract able to transfer the tokens
    /// @param _amount The amount of tokens to be approved for transfer
    /// @return True if the function call was successful
    function approveAndCall(address _spender, uint256 _amount, bytes memory _extraData
    ) public returns (bool success) {
        require(approve(_spender, _amount));

        ApproveAndCallFallBack(_spender).receiveApproval(
            msg.sender,
            _amount,
            address(this),
            _extraData
        );

        return true;
    }

    /// @dev This function makes it easy to get the total number of tokens
    /// @return The total number of tokens
    function totalSupply() public view returns (uint) {
        return totalSupplyAt(block.number);
    }

////////////////
// Query balance and totalSupply in History
////////////////

    /// @dev Queries the balance of `_owner` at a specific `_blockNumber`
    /// @param _owner The address from which the balance will be retrieved
    /// @param _blockNumber The block number when the balance is queried
    /// @return The balance at `_blockNumber`
    function balanceOfAt(address _owner, uint _blockNumber) public view
        returns (uint) {

        if ((balances[_owner].length == 0) || (balances[_owner][0].fromBlock > _blockNumber)) {
            return 0;

        // This will return the expected balance during normal situations
        } else {
            return getValueAt(balances[_owner], _blockNumber);
        }
    }

    /// @notice Total amount of tokens at a specific `_blockNumber`.
    /// @param _blockNumber The block number when the totalSupply is queried
    /// @return The total amount of tokens at `_blockNumber`
    function totalSupplyAt(uint _blockNumber) public view returns(uint) {

        if ((totalSupplyHistory.length == 0) || (totalSupplyHistory[0].fromBlock > _blockNumber)) {
            return 0;

        // This will return the expected totalSupply during normal situations
        } else {
            return getValueAt(totalSupplyHistory, _blockNumber);
        }
    }

////////////////
// Generate and destroy tokens
////////////////

    /// @notice Generates `_amount` tokens that are assigned to `_owner`
    /// @param _owner The address that will be assigned the new tokens
    /// @param _amount The quantity of tokens generated
    /// @return True if the tokens are generated correctly
    function mint(address _owner, uint _amount
    ) public onlyController returns (bool) {
        uint curTotalSupply = totalSupply();
        uint previousBalanceTo = balanceOf(_owner);

        updateValueAtNow(totalSupplyHistory, curTotalSupply.add(_amount));
        updateValueAtNow(balances[_owner], previousBalanceTo.add(_amount));

        emit Transfer(address(0), _owner, _amount);
        return true;
    }

    //TODO: Implement Burn
    function burn(address _owner, uint _amount) public onlyController returns (bool) {
        uint curTotalSupply = totalSupply();
        uint previousBalanceTo = balanceOf(_owner);

        updateValueAtNow(totalSupplyHistory, curTotalSupply.sub(_amount));
        updateValueAtNow(balances[_owner], previousBalanceTo.sub(_amount));

        emit Transfer(address(0), _owner, _amount);
        return true;
    }

////////////////
// Enable tokens transfers
////////////////

    /// @notice Enables token holders to transfer their tokens freely if true
    /// @param _transfersEnabled True if transfers are allowed in the clone
    function enableTransfers(bool _transfersEnabled) public onlyController {
        transfersEnabled = _transfersEnabled;
    }

////////////////
// Internal helper functions to query and set a value in a snapshot array
////////////////

    /// @dev `getValueAt` retrieves the number of tokens at a given block number
    /// @param checkpoints The history of values being queried
    /// @param _block The block number to retrieve the value at
    /// @return The number of tokens being queried
    function getValueAt(Checkpoint[] storage checkpoints, uint _block
    ) view internal returns (uint) {
        if (checkpoints.length == 0) return 0;

        // Shortcut for the actual value
        if (_block >= checkpoints[checkpoints.length-1].fromBlock)
            return checkpoints[checkpoints.length-1].value;
        if (_block < checkpoints[0].fromBlock) return 0;

        // Binary search of the value in the array
        uint min = 0;
        uint max = checkpoints.length-1;
        while (max > min) {
            uint mid = (max + min + 1)/ 2;
            if (checkpoints[mid].fromBlock<=_block) {
                min = mid;
            } else {
                max = mid-1;
            }
        }
        return checkpoints[min].value;
    }

    /// @dev `updateValueAtNow` used to update an array of Checkpoints
    /// @param checkpoints The history of data being updated
    /// @param _value The new number of tokens
    function updateValueAtNow(Checkpoint[] storage checkpoints, uint _value
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

    /// @dev Internal function to determine if an address is a contract
    /// @param _addr The address being queried
    /// @return True if `_addr` is a contract
    function isContract(address _addr) view internal returns(bool) {
        uint size;
        if (_addr == address(0)) return false;
        assembly {
            size := extcodesize(_addr)
        }
        return size>0;
    }

    /// @dev Helper function to return a min betwen the two uints
    function min(uint a, uint b) pure internal returns (uint) {
        return a < b ? a : b;
    }

//////////
// Safety Methods
//////////
    
    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent ether to this contract.
    function claimEther() public onlyController {
            controller.transfer(address(this).balance);
            emit ClaimedEther(controller, address(this).balance);
    }

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    function claimTokens(address _token) public onlyController {
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        token.transfer(controller, balance);
        emit ClaimedTokens(_token, controller, balance);
    }
}