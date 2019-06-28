pragma solidity ^0.5.0;

/// @title  BondingCurvedToken - A bonding curve
///         implementation that is backed by an ERC20 token.
interface IBondingCurve {
    /// @dev                Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) external view returns(uint256);

    /// @dev                Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) external view returns(uint256);

    /// @dev                    Get the dividend tokens that would currently be recieved for a specified amonut of reserve currency
    /// @param reserveTokens    The number of reserve tokens to calculate result for
    // function tokensForValue(uint256 reserveTokens) external view returns(uint256);

    /// @dev                Buy a given number of bondedTokens with a number of collateralTokens determined by the current rate from the buy curve.
    /// @param numTokens    The number of bondedTokens to buy
    /// @param maxPrice     Maximum total price allowable to pay in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function buy(
        uint256 numTokens,
        uint256 maxPrice,
        address recipient
    ) external returns(uint256);

    /// @dev                Sell a given number of bondedTokens for a number of collateralTokens determined by the current rate from the sell curve.
    /// @param numTokens    The number of bondedTokens to sell
    /// @param minPrice     Minimum total price allowable to receive in collateralTokens
    /// @param recipient    Address to send the new bondedTokens to
    function sell(
        uint256 numTokens,
        uint256 minPrice,
        address recipient
    ) external returns(uint256);

    /// @dev                Pay tokens to the DAO. This method ensures the dividend holders get a distribution before the DAO gets the funds
    /// @param numTokens    The number of ERC20 tokens you want to pay to the contract
    function pay(uint256 numTokens) external;
}