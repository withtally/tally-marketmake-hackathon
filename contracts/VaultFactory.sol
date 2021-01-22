pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VaultNFT is ERC721, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(address admin) public ERC721("VaultNFT", "VNFT") {
        _setupRole(ADMIN_ROLE, admin);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
    }

    function mint(address account) external returns (uint256) {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");

        _tokenIds.increment();
        uint256 newVaultId = _tokenIds.current();
        _mint(account, newVaultId);

        return newVaultId;
    }

    function burn(uint256 vaultId) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _burn(vaultId);
    }
}

contract VaultToken is ERC20, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(address admin) public ERC20("VaultToken", "VT") {
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

contract VaultFactory is AccessControl {
    IERC20 public vaultToken;
    IERC721 public vaultNFT;

    constructor() public {
        vaultToken = new VaultToken(address(this));
        vaultNFT = new VaultNFT(address(this));
    }
}
