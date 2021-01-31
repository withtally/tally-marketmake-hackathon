pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    mapping(address => address) public delegates;

    constructor() public ERC20("MockToken", "MT") {
        _mint(msg.sender, 100e18);
    }

    /**
     * @notice Delegate votes from `msg.sender` to `delegatee`
     * @param delegatee The address to delegate votes to
     */
    function delegate(address delegatee) public {
        delegates[msg.sender] = delegatee;
    }

}
