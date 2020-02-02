pragma solidity ^0.5.0;

/// @title  IBondingCurve - Partial bonding curve interface
contract IBondingCurve {
    /// @dev                Get the price in collateralTokens to mint bondedTokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns(uint256);

    /// @dev                Get the reward in collateralTokens to burn bondedTokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns(uint256);

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function sell(
        uint256 numTokens,
        uint256 minPrice,
        address recipient
    ) public returns(uint256 collateralReceived);
}