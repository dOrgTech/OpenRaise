pragma solidity ^0.5.0;

/// @title  BondingCurvedToken - A bonding curve
///         implementation that is backed by an ERC20 token.
contract IBondingCurve {
    /// @dev                Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) public view returns(uint256);

    /// @dev                Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) public view returns(uint256);

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param amount       The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function buy(
        uint256 amount,
        uint256 maxPrice,
        address recipient
    ) public returns(uint256 collateralSent);

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param amount       The number of bondedTokens to sell
    /// @param minReturn    Minimum total collateralTokens to accept. Reject sell if condition isn't met
    /// @param recipient    Address to send the new bondedTokens to
    function sell(
        uint256 amount,
        uint256 minReturn,
        address recipient
    ) public returns(uint256 collateralReceived);

    /// @dev                Pay the beneficiary in collateral currency. This method ensures the dividend holders get a distribution before the DAO gets the funds
    /// @param amount       The amount of collateral currency to pay to the beneficiary
    function pay(uint256 amount) public;
}