pragma solidity >= 0.4.22 <6.0.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Mintable.sol";

/**
 * @title Dividend Token
 * @dev A standard ERC20, using Detailed & Mintable featurs. Accepts a single minter, which should be the BondingCurve. The minter also has exclusive burning rights.
 */
contract BondedToken is Initializable, ERC20Detailed, ERC20Mintable {

    /// @dev Initialize contract
    /// @param name ERC20 token name
    /// @param symbol ERC20 token symbol
    /// @param decimals ERC20 token decimals
    /// @param minter Address to give exclusive minting and burning rights for token
    function initialize(string memory name, string memory symbol, uint8 decimals, address minter) public initializer {
        ERC20Detailed.initialize(name, symbol, decimals);
        ERC20Mintable.initialize(minter);
    }

    /**
     * @dev Burns a specific amount of tokens.
     * @param value The amount of token to be burned.
     */
    function burn(address from, uint256 value) public onlyMinter {
        _burn(from, value);
    }
}
