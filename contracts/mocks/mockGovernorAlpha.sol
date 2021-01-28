pragma solidity ^0.7.4;

contract MockGovernorAlpha {
    uint public proposalCount;

    struct Receipt {
        bool hasVoted;
        bool support;
    }

    struct Proposal {
        uint id;
        uint forVotes;
        uint againstVotes;
        mapping (address => Receipt) receipts;
    }

    mapping (uint => Proposal) public proposals;

    function _castVote(address voter, uint proposalId, bool support) internal {
        Proposal storage proposal = proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];

        if (support) {
            proposal.forVotes++;
        } else {
            proposal.againstVotes++;
        }

        receipt.hasVoted = true;
        receipt.support = support;
    }

}