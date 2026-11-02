// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Counter
/// @notice The contract every learner deploys in lesson 4. It has no immutables and no
///         constructor arguments, so every copy shares one code hash that the Progress
///         contract can recognise.
contract Counter {
    address public owner;
    uint256 public count;

    event Incremented(address indexed by, uint256 newCount);

    constructor() {
        owner = msg.sender;
    }

    function increment() external {
        count += 1;
        emit Incremented(msg.sender, count);
    }
}
