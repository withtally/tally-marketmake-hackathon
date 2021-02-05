pragma solidity ^0.7.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./VaultToken.sol";
import "./VaultNFT.sol";
import "./Vault.sol";

// Interfaces
import "./interfaces/ICompoundERC20.sol";
import "./interfaces/ICompoundGovernorAlpha.sol";

contract VaultFactory is AccessControl {
    using SafeERC20 for ICompoundERC20;
    using SafeMath for uint256;

    uint256 public epochSize;
    VaultToken public vaultToken;
    VaultNFT public vaultNFT;
    ICompoundERC20 public sourceToken;
    ICompoundGovernorAlpha public governorAlpha;
    mapping (uint256 => Vault) public vaultMapping;
    // mapping of vaults to expiry epochs
    mapping (uint256 => uint256) public vaultToExpiryEpochs;
    mapping (uint256 => address) public vaultToAddress;

    event VaultCreated(address creator, uint256 amount, uint256 vaultId, address vaultAddress);
    event VaultClosedByOwner(address owner, uint256 vaultId, address vaultAddress);
    event ExpiredVaultClosed(address closer, uint256 vaultId, address vaultAddress);

    constructor(ICompoundERC20 _sourceToken, ICompoundGovernorAlpha _governorAlpha, uint256 _epochSize) {
        epochSize = _epochSize;
        vaultToken = new VaultToken(address(this));
        vaultNFT = new VaultNFT(address(this));
        sourceToken = _sourceToken;
        governorAlpha = _governorAlpha;
    }

    function currentEpochExpiry() public view returns (uint256)  {
        return block.number.div(epochSize).add(1).mul(epochSize);
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
        vaultToExpiryEpochs[vaultId] = currentEpochExpiry();
        vaultToAddress[vaultId] = msg.sender;
        emit VaultCreated(msg.sender, amount, vaultId, address(newVault));
    }

    function closeOwnVault(uint256 vaultId) external { 
        require(msg.sender == vaultNFT.ownerOf(vaultId), "Not your stuff");

        _close(vaultId, msg.sender);
        emit VaultClosedByOwner(msg.sender, vaultId, address(vaultMapping[vaultId]));
    }

    function closeExpiredVault(uint256 vaultId) external { 
        require(vaultToExpiryEpochs[vaultId] != 0, "Vault doesn't exist");
        require(vaultToExpiryEpochs[vaultId] < block.number, "Vault not yet expired");
        require(vaultNFT.ownerOf(vaultId) != address(0), "Vault already closed");

        _close(vaultId, msg.sender);
        emit ExpiredVaultClosed(msg.sender, vaultId, address(vaultMapping[vaultId]));
    }

    function _close(uint256 vaultId, address receipient) private { 
        Vault vault = vaultMapping[vaultId];

        uint256 sourceBalanceBefore = sourceToken.balanceOf(address(vault));
        uint256 vaultBalanceBefore = vaultToken.balanceOf(receipient);
        require(vaultBalanceBefore >= sourceBalanceBefore, "Not enough tokens to close vault");

        vaultToken.burn(receipient, vaultBalanceBefore);
        uint256 vaultBalanceAfter = vaultToken.balanceOf(address(vault));
        require(vaultBalanceBefore.sub(sourceBalanceBefore) == vaultBalanceAfter, "Where's my money?");

        vaultNFT.burn(vaultId);
        
        vaultMapping[vaultId].close(receipient);
    }

    function vaultByAddress(address _owner) external view returns(uint256[] memory ownerTokens) {
        uint256 tokenCount = vaultNFT.balanceOf(_owner);

        if (tokenCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 totalVaults = vaultNFT.totalSupply();
            uint256 resultIndex = 0;

            uint256 vaultId;

            for (vaultId = 1; vaultId <= totalVaults; vaultId++) {
                if (vaultToAddress[vaultId] == _owner) {
                    result[resultIndex] = vaultId;
                    resultIndex++;
                }
            }

            return result;
        }
    }
}
