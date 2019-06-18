pragma solidity ^0.5.0;

/// @title  BondingCurvedToken - A bonding curve
///         implementation that is backed by an ERC20 token.
interface IBondingCurve {

    event Mint(uint256 amount, uint256 totalCost);
    event Burn(uint256 amount, uint256 reward);

    /// @dev                Get the price in ether to mint tokens
    /// @param numTokens    The number of tokens to calculate price for
    function priceToBuy(uint256 numTokens) external view returns(uint256);

    /// @dev                Get the reward in ether to burn tokens
    /// @param numTokens    The number of tokens to calculate reward for
    function rewardForSell(uint256 numTokens) external view returns(uint256);

    /// @dev                    Get the dividend tokens that would currently be recieved for a specified amonut of reserve currency
    /// @param reserveTokens    The number of reserve tokens to calculate result for
    // function tokensForValue(uint256 reserveTokens) external view returns(uint256);

    /// @dev                Mint new tokens with ether
    /// @param numTokens    The number of tokens you want to mint
    function mint(uint256 numTokens) external;

    /// @dev                Burn tokens to receive ether
    /// @param numTokens    The number of tokens that you want to burn
    function burn(uint256 numTokens) external;

    /// @dev                Pay tokens to the DAO. This method ensures the dividend holders get a distribution before the DAO gets the funds
    /// @param numTokens    The number of ERC20 tokens you want to pay to the contract
    function pay(uint256 numTokens) external;
}
