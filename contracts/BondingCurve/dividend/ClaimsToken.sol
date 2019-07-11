pragma solidity ^0.5.0;

// External dependencies.
import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";

/// Much structure taken from Giveth's MiniMeToken: https://github.com/Giveth/minime
contract ClaimsToken is Initializable, Ownable, ERC20Detailed {
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
    event ClaimedTokens(address indexed token, address indexed recipient, uint value);
    event ClaimedEther(address indexed recipient, uint value);
////////////////
// Constructor
////////////////

    /// @notice Constructor to create a ClaimsToken
    /// @param _transfersEnabled If true, tokens will be able to be transferred
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _owner,
        bool _transfersEnabled
    )
        public
        initializer
    {
        Ownable.initialize(_owner);
        ERC20Detailed.initialize(_name, _symbol, _decimals);
        transfersEnabled = _transfersEnabled;
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

        // The owner of this contract can move tokens around at will,
        //  this is important to recognize! Confirm that you trust the
        //  owner of this contract, which in most situations should be
        //  another open source smart contract or 0x0
        if (!isOwner()) {
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
    ) public onlyOwner returns (bool) {
        uint curTotalSupply = totalSupply();
        uint previousBalanceTo = balanceOf(_owner);

        updateValueAtNow(totalSupplyHistory, curTotalSupply.add(_amount));
        updateValueAtNow(balances[_owner], previousBalanceTo.add(_amount));

        emit Transfer(address(0), _owner, _amount);
        return true;
    }

    //TODO: Implement Burn
    function burn(address _owner, uint _amount) public onlyOwner returns (bool) {
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
    function enableTransfers(bool _transfersEnabled) public onlyOwner {
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
    
    /// @notice This method can be used by the owner to extract mistakenly
    ///  sent ether to this contract.
    function claimEther() public onlyOwner {
            address payable ownerAddress = address(uint160(owner()));
            ownerAddress.transfer(address(this).balance);
            emit ClaimedEther(ownerAddress, address(this).balance);
    }

    /// @notice This method can be used by the owner to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    function claimTokens(address _token) public onlyOwner {
        address payable ownerAddress = address(uint160(owner()));
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        token.transfer(ownerAddress, balance);
        emit ClaimedTokens(_token, ownerAddress, balance);
    }
}