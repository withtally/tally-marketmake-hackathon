pragma solidity ^0.7.4;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract VaultToken is ERC20, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(address admin) ERC20("VaultToken", "VT") {
        _setupRole(ADMIN_ROLE, admin);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
    }

    function mint(address account, uint256 amount) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _burn(account, amount);
    }
}
