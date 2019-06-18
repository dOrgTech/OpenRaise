pragma solidity ^0.5.4;

/// @title  Curve - A specific curve implementation used by a BondingCurvedToken.
interface ICurveLogic {
    
    /// @dev                    Get the price to mint tokens
    /// @param totalSupply      The existing number of curve tokens
    /// @param amount           The number of curve tokens to mint
    function calcMintPrice(
        uint256 totalSupply,
        uint256 amount
    ) external view returns (uint256);

    /// @dev                    Get the reward to burn tokens
    /// @param totalSupply      The existing number of curve tokens
    /// @param amount           The number of curve tokens to burn
    function calcBurnReward(
        uint256 totalSupply,
        uint256 amount
    ) external view returns (uint256);
    
    /// @dev                    Get the amount of tokens that could be minted for a given cost
    /// @param totalSupply      The existing number of curve tokens
    /// @param cost             The cost to spend on minting
    // function calcMintAmount(
    //     uint256 totalSupply,
    //     uint256 cost
    // ) external view returns (uint256);
}