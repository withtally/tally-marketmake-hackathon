pragma solidity ^0.7.4;

interface IVaultNFT {
    function ownerOf(uint256 tokenId) external view returns (address owner);
}