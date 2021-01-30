pragma solidity ^0.7.4;

// Compound governor alpha interface
interface ICompoundGovernorAlpha {
    function castVote(uint proposalId, bool support) external;
    function castVoteBySig(uint proposalId, bool support, uint8 v, bytes32 r, bytes32 s) external;
}
