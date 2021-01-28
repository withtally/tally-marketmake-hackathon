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

// Compound Token Interface
interface ICompoundERC20 is IERC20 {
  function delegate(address delegatee) external;
}

// Compound governor alpha interface
interface ICompoundGovernorAlpha {
    function castVote(uint proposalId, bool support) external;
    function castVoteBySig(uint proposalId, bool support, uint8 v, bytes32 r, bytes32 s) external;
}

contract Vault {
    using SafeERC20 for ICompoundERC20;

    ICompoundERC20 public sourceToken;
    ICompoundGovernorAlpha public governorAlpha;
    address public owner;
    IERC721 public nft; 
    uint256 public vaultId;

    event Delegation(address delegator, address delegatee);
    event Voted(address voter, uint256 proposalId, bool support);

    constructor(ICompoundERC20 _sourceToken, ICompoundGovernorAlpha _governorAlpha, address _nft, uint256 _vaultId) {
        owner = msg.sender;
        sourceToken = _sourceToken;
        governorAlpha = _governorAlpha;
        nft = IERC721(_nft);
        vaultId = _vaultId;
    }

    // delegate on underlying governance
    function delegate(address delegatee) external {
        require(msg.sender == nft.ownerOf(vaultId), "You're not the owner of this vault");
        sourceToken.delegate(delegatee);
        emit Delegation(msg.sender, delegatee);
    }

    // vote on underlying governance
    function vote(uint proposalId, bool support) external {
        require(msg.sender == nft.ownerOf(vaultId), "You're not the owner of this vault");
        governorAlpha.castVote(proposalId, support);
        emit Voted(msg.sender, proposalId, support);
    }

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
    using SafeERC20 for ICompoundERC20;
    using SafeMath for uint256;

    VaultToken public vaultToken;
    VaultNFT public vaultNFT;
    ICompoundERC20 public sourceToken;
    ICompoundGovernorAlpha public governorAlpha;
    mapping (uint256 => Vault) public vaultMapping;

    event VaultCreated(address creator, uint256 amount, uint256 vaultId, address vaultAddress);

    constructor(ICompoundERC20 _sourceToken, ICompoundGovernorAlpha _governorAlpha) public {
        vaultToken = new VaultToken(address(this));
        vaultNFT = new VaultNFT(address(this));
        sourceToken = _sourceToken;
        governorAlpha = _governorAlpha;
    }

    function createVault (uint256 amount) external {
        uint256 vaultId = vaultNFT.mint(msg.sender);
        Vault newVault = new Vault(sourceToken, governorAlpha, address(vaultNFT), vaultId);

        uint256 balanceBefore = sourceToken.balanceOf(address(newVault));
        sourceToken.safeTransferFrom(msg.sender, address(newVault), amount);
        sourceToken.delegate(address(newVault));
        uint256 balanceAfter = sourceToken.balanceOf(address(newVault));
        require(balanceAfter.sub(balanceBefore) == amount, "Where's my money?");
        vaultToken.mint(msg.sender, amount);
        
        vaultMapping[vaultId] = newVault;
        emit VaultCreated(msg.sender, amount, vaultId, address(newVault));
    }

    function close(uint256 vaultId) external { 
        require(msg.sender == vaultNFT.ownerOf(vaultId), "Not your stuff");

        Vault vault = vaultMapping[vaultId];

        uint256 sourceBalanceBefore = sourceToken.balanceOf(address(vault));
        uint256 vaultBalanceBefore = vaultToken.balanceOf(msg.sender);
        require(vaultBalanceBefore >= sourceBalanceBefore, "Not enough tokens to close vault");

        vaultToken.burn(msg.sender, vaultBalanceBefore);
        uint256 vaultBalanceAfter = vaultToken.balanceOf(address(vault));
        require(vaultBalanceBefore.sub(sourceBalanceBefore) == vaultBalanceAfter, "Where's my money?");

        vaultNFT.burn(vaultId);
        
        vaultMapping[vaultId].close(msg.sender);
    }

}
