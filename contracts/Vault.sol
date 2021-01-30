pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// Interfaces
import "./interfaces/ICompoundERC20.sol";
import "./interfaces/ICompoundGovernorAlpha.sol";
import "./interfaces/IVaultNFT.sol";

contract Vault {
    using SafeERC20 for ICompoundERC20;

    ICompoundERC20 public sourceToken;
    ICompoundGovernorAlpha public governorAlpha;
    address public owner;
    IVaultNFT public nft; 
    uint256 public vaultId;

    event Delegation(address delegator, address delegatee);
    event Voted(address voter, uint256 proposalId, bool support);

    constructor(ICompoundERC20 _sourceToken, ICompoundGovernorAlpha _governorAlpha, address _nft, uint256 _vaultId) {
        owner = msg.sender;
        sourceToken = _sourceToken;
        governorAlpha = _governorAlpha;
        nft = IVaultNFT(_nft);
        vaultId = _vaultId;
    }

    // delegate on underlying governance
    function delegate(address delegatee) external {
        require(msg.sender == nft.ownerOf(vaultId), "You're not the owner of this vault");
        sourceToken.delegate(delegatee);
        emit Delegation(address(this), delegatee);
    }

    // vote on underlying governance
    function vote(uint proposalId, bool support) external {
        require(msg.sender == nft.ownerOf(vaultId), "You're not the owner of this vault");
        governorAlpha.castVote(proposalId, support);
        emit Voted(msg.sender, proposalId, support);
    }

    // close vault and return funds
    function close (address recipient) external {
        require(msg.sender == owner, "Caller does not own this vault");
        uint256 vaultBalanceBefore = sourceToken.balanceOf(address(this));
        sourceToken.safeTransfer(recipient, vaultBalanceBefore);
        require(sourceToken.balanceOf(address(this)) == 0, "Unexpected error transferring tokens");
    }
}