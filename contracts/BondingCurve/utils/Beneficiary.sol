pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Beneficiary
 * @dev The Beneficiary is indended has a right to a portion of funds paid out to the bonding curve. 
 * The process to set the initial beneficiary is handled by the inheritor.
 */

contract Beneficiary is Ownable {
    address public beneficiary;

    event BeneficiarySet(address indexed account);

    function isBeneficiary(address account) public view returns (bool) {
        return beneficiary == account;
    }

    function setBeneficiary(address account) public onlyOwner {
        beneficiary = account;
        emit BeneficiarySet(account);
    }
}