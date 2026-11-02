// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FirstBlockGraduation
/// @notice Mainnet contract where learners record that they finished First Block.
///         Mainnet cannot read testnet, so this contract does not verify the lessons itself:
///         the website only unlocks graduate() after a wallet passes 5 of 5 on testnet, and
///         the graduates wall marks an entry Verified only when the testnet Progress contract
///         confirms it. There are no tokens, payments or admin functions.
contract FirstBlockGraduation {
    uint256 public constant NOTE_MAX = 80;

    struct Grad {
        address wallet;
        string note;
        uint64 at;
    }

    Grad[] public grads;
    /// Position of a wallet in grads plus one, so 0 means "not a graduate".
    mapping(address => uint256) public gradId;

    event Graduated(uint256 indexed id, address indexed wallet);

    error AlreadyGraduated();
    error NoteTooLong();

    function graduate(string calldata note) external {
        if (gradId[msg.sender] != 0) revert AlreadyGraduated();
        if (bytes(note).length > NOTE_MAX) revert NoteTooLong();
        grads.push(Grad(msg.sender, note, uint64(block.timestamp)));
        uint256 id = grads.length;
        gradId[msg.sender] = id;
        emit Graduated(id, msg.sender);
    }

    function total() external view returns (uint256) {
        return grads.length;
    }

    function isGraduate(address who) external view returns (bool) {
        return gradId[who] != 0;
    }

    /// A page of graduates, oldest first. Ids shown on the site are index + 1.
    function getGrads(uint256 from, uint256 count) external view returns (Grad[] memory page) {
        uint256 n = grads.length;
        if (from >= n) return new Grad[](0);
        uint256 end = from + count > n ? n : from + count;
        page = new Grad[](end - from);
        for (uint256 i = from; i < end; i++) {
            page[i - from] = grads[i];
        }
    }
}
