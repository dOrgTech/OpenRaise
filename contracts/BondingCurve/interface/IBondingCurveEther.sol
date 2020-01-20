pragma solidity ^0.5.0;
import "contracts/BondingCurve/interface/IBondingCurve.sol";

/// @title  IBondingCurveEther - A bonding curve
///         implementation that is backed by ether.
contract IBondingCurveEther is IBondingCurve {
    /// @dev                Buy a given number of bondedTokens with a number of ether determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in ether
    /// @param recipient    Address to send the new bondedTokens to
    function buy(
        uint256 numTokens,
        uint256 maxPrice,
        address recipient
    ) public payable returns(uint256 collateralSent);

    /// @dev                Pay tokens to the DAO. This method ensures the dividend holders get a distribution before the DAO gets the funds
    /// @param numTokens    The number of ERC20 tokens you want to pay to the contract
    function pay(uint256 numTokens) public payable;
}