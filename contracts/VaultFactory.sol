pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

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

contract Vault {
    using SafeERC20 for IERC20;

    IERC20 public sourceToken;
    address public owner;

    constructor(IERC20 _sourceToken) {
        owner = msg.sender;
        sourceToken = _sourceToken;
    }

    // delegate on underlying governance

    // vote on underlying governance

    // close vault and return funds
    function close (address payable recipient) external {
        require(msg.sender == owner, "Caller does not own this vault");
        uint256 vaultBalanceBefore = sourceToken.balanceOf(address(this));
        sourceToken.safeTransfer(recipient, vaultBalanceBefore);
        require(sourceToken.balanceOf(address(this)) == 0, "Unexpected error transferring tokens");
        selfdestruct(recipient);
    }
}

contract VaultFactory is AccessControl {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    VaultToken public vaultToken;
    VaultNFT public vaultNFT;
    IERC20 public sourceToken;

    event VaultCreated(address creator, uint256 amount, uint256 vaultId);

    constructor(IERC20 _sourceToken) public {
        vaultToken = new VaultToken(address(this));
        vaultNFT = new VaultNFT(address(this));
        sourceToken = _sourceToken;
    }

    function createVault (uint256 amount) external {
        uint256 balanceBefore = sourceToken.balanceOf(address(this));
        sourceToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = sourceToken.balanceOf(address(this));
        require(balanceAfter.sub(balanceBefore) == amount, "Where's my money?");
        vaultToken.mint(msg.sender, amount);
        uint256 vaultId = vaultNFT.mint(msg.sender);
        emit VaultCreated(msg.sender, amount, vaultId);
    }


}
