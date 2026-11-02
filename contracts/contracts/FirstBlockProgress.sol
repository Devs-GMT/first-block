// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICounter {
    function owner() external view returns (address);
    function count() external view returns (uint256);
}

/// @title FirstBlockProgress
/// @notice Testnet contract that checks each First Block lesson on chain. Every lesson
///         unlocks the next, and nothing here is self-reported.
contract FirstBlockProgress {
    uint256 public constant TIP_MIN = 0.001 ether;
    uint256 public constant NAME_MAX = 24;

    /// Bit i (0-based) is set once lesson i + 1 is passed.
    mapping(address => uint8) public lessonsDone;
    mapping(address => address) public counterOf;
    uint256[5] private _finished;

    bytes32 public immutable counterCodeHash;
    address public immutable owner;

    event LessonDone(address indexed learner, uint8 lesson);
    event Hello(address indexed learner, string name);

    error NotDone(uint8 lesson);
    error NoGas();
    error TipTooSmall();
    error BadName();
    error NotACounter();
    error NotYourCounter();
    error CountTooLow(uint256 count);
    error NotOwner();
    error SweepFailed();

    constructor(bytes32 counterCodeHash_) {
        counterCodeHash = counterCodeHash_;
        owner = msg.sender;
    }

    /// Lesson 1: the wallet holds some BOT, so it is set up and has gas.
    function checkIn() external {
        if (msg.sender.balance == 0) revert NoGas();
        _pass(1);
    }

    /// Lesson 2: send at least 0.001 test BOT to this contract.
    function tip() external payable {
        _require(1);
        if (msg.value < TIP_MIN) revert TipTooSmall();
        _pass(2);
    }

    /// Lesson 3: say hello. The name is emitted as an event so a site can read it back.
    function sayHello(string calldata name) external {
        _require(2);
        uint256 len = bytes(name).length;
        if (len == 0 || len > NAME_MAX) revert BadName();
        emit Hello(msg.sender, name);
        _pass(3);
    }

    /// Lesson 4: submit a Counter you deployed. It must have the right code and be owned by you.
    function submitCounter(address c) external {
        _require(3);
        if (c.code.length == 0 || c.codehash != counterCodeHash) revert NotACounter();
        if (ICounter(c).owner() != msg.sender) revert NotYourCounter();
        counterOf[msg.sender] = c;
        _pass(4);
    }

    /// Lesson 5: your Counter has been incremented at least three times.
    function finishCounter() external {
        _require(4);
        uint256 n = ICounter(counterOf[msg.sender]).count();
        if (n < 3) revert CountTooLow(n);
        _pass(5);
    }

    /// How many lessons the wallet has passed (0 to 5) and the raw bit flags.
    function progressOf(address who) external view returns (uint8 done, uint8 flags) {
        flags = lessonsDone[who];
        for (uint8 i = 0; i < 5; i++) {
            if (flags & (1 << i) != 0) done++;
        }
    }

    /// How many wallets have passed each lesson.
    function stats() external view returns (uint256[5] memory) {
        return _finished;
    }

    /// Test BOT sent in lesson 2 stays here. The owner can send it back to the faucet.
    function sweep(address payable to) external {
        if (msg.sender != owner) revert NotOwner();
        (bool ok, ) = to.call{value: address(this).balance}("");
        if (!ok) revert SweepFailed();
    }

    function _require(uint8 lesson) private view {
        if (lessonsDone[msg.sender] & (1 << (lesson - 1)) == 0) revert NotDone(lesson);
    }

    function _pass(uint8 lesson) private {
        uint8 bit = uint8(1 << (lesson - 1));
        if (lessonsDone[msg.sender] & bit != 0) return;
        lessonsDone[msg.sender] |= bit;
        _finished[lesson - 1]++;
        emit LessonDone(msg.sender, lesson);
    }
}
