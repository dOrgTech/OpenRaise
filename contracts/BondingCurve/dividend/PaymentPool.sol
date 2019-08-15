pragma solidity ^0.5.6;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

/**
 * @title Payment Pool
 * @dev Allows withdrawals of tokens according to amounts specified by lates merkle root, uploaded by the owner
 * Works with a single ß token
 */

contract PaymentPool is Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using MerkleProof for bytes32[];

    IERC20 internal _token;
    uint256 internal _numPaymentCycles;
    mapping(address => uint256) internal _withdrawals;

    mapping(uint256 => bytes32) internal _payeeRoots;
    uint256 internal _currentPaymentCycleStartBlock;

    event PaymentCycleEnded(
        uint256 paymentCycle,
        uint256 startBlock,
        uint256 endBlock
    );
    event PayeeWithdraw(address indexed payee, uint256 amount);

    /// @dev Initialize contract
    /// @param token Token to recieve and track payments.
    /// @param owner Contract owner. Has exclusive rights to upload new merkle roots.
    function initialize(IERC20 token, address owner) public initializer {
        Ownable.initialize(owner);
        _token = token;
        _numPaymentCycles = 1;
        _currentPaymentCycleStartBlock = block.number;
    }

    function startNewPaymentCycle() internal onlyOwner returns (bool) {
        // disabled for hevm debugging
        require(block.number > _currentPaymentCycleStartBlock);

        emit PaymentCycleEnded(
            _numPaymentCycles,
            _currentPaymentCycleStartBlock,
            block.number
        );

        _numPaymentCycles = _numPaymentCycles.add(1);
        _currentPaymentCycleStartBlock = block.number.add(1);

        return true;
    }

    function submitPayeeMerkleRoot(bytes32 payeeRoot)
        public
        onlyOwner
        returns (bool)
    {
        _payeeRoots[_numPaymentCycles] = payeeRoot;

        startNewPaymentCycle();

        return true;
    }
    function balanceForProofWithAddress(
        address _address,
        uint256 cumAmount,
        uint256 _paymentCycle,
        bytes32[] memory proof
    ) public view returns (uint256) {
        if (_payeeRoots[_paymentCycle] == 0x0) {
            return 0;
        }

        bytes32 leaf = keccak256(abi.encodePacked(_address, cumAmount));

        if (
            _withdrawals[_address] < cumAmount &&
            proof.verify(_payeeRoots[_paymentCycle], leaf)
        ) {
            return cumAmount.sub(_withdrawals[_address]);
        } else {
            return 0;
        }
    }
    function balanceForProof(
        uint256 cumAmount,
        uint256 _paymentCycle,
        bytes32[] memory proof
    ) public view returns (uint256) {
        return
            balanceForProofWithAddress(
                msg.sender,
                cumAmount,
                _paymentCycle,
                proof
            );
    }
    function withdraw(
        uint256 amount,
        uint256 cumAmount,
        uint256 _paymentCycle,
        bytes32[] memory proof
    ) public returns (bool) {
        require(amount > 0);
        require(_token.balanceOf(address(this)) >= amount);

        uint256 balance = balanceForProof(cumAmount, _paymentCycle, proof);
        require(balance >= amount);

        _withdrawals[msg.sender] = _withdrawals[msg.sender].add(amount);
        _token.safeTransfer(msg.sender, amount);

        emit PayeeWithdraw(msg.sender, amount);
    }

    /// @notice Get payment token
    function token() public view returns (IERC20) {
        return _token;
    }

    /// @notice Get current payment cycle
    function numPaymentCycles() public view returns (uint256) {
        return _numPaymentCycles;
    }

    /// @notice Get token amount previously withdrawn by address
    function withdrawals(address account) public view returns (uint256) {
        return _withdrawals[account];
    }
}
