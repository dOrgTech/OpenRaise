pragma solidity ^0.5.0;

/// @title  ReserveLogic - A reserve mechanism for bonding curve
interface IReserveLogic {

    event Mint(uint256 amount, uint256 totalCost);
    event Burn(uint256 amount, uint256 reward);

    /// @dev                Mint new tokens with ether
    /// @param numTokens    The number of tokens you want to mint
    function buy(uint256 numTokens) external;

    /// @dev                Burn tokens to receive ether
    /// @param numTokens    The number of tokens that you want to burn
    function sell(uint256 numTokens) external;
}
