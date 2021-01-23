pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {

    constructor() public ERC20("MockToken", "MT") {
        _mint(msg.sender, 100e18);
    }

}
