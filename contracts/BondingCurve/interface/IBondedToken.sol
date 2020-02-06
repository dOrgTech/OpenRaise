pragma solidity ^0.5.0;

/// @title  IBondedToken
contract IBondedToken {
    /**
     * @dev Burns a specific amount of tokens.
     * @param value The amount of token to be burned.
     */
    function burn(address from, uint256 value) public;

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 value) public returns (bool);

    /**
     * @dev Reads current accumulated reward for address.
     * @param staker The address to query the reward balance for.
     */
    function getReward(address staker) public view returns (uint256 tokens);

    /**
     * @dev Withdraw accumulated reward for the sender address.
     */
    function withdrawReward() public returns (uint256);

    /**
     * Claim and allocate provided dividend tokens to all balances greater than ELIGIBLE_UNIT.
     */
    function distribute(address from, uint256 value) public payable returns (bool);

    function transfer(address to, uint256 value) public returns (bool);

    function approve(address spender, uint256 value) public returns (bool);

    function transferFrom(address from, address to, uint256 value) public returns (bool);

    function totalSupply() public view returns (uint256);

    function balanceOf(address who) public view returns (uint256);

    function allowance(address owner, address spender) public view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}
