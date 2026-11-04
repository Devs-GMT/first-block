// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICounter {
    function owner() external view returns (address);
    function count() external view returns (uint256);
}

/// @title FirstBlock
/// @notice One contract for the whole First Block course, deployed on BOT Chain mainnet. It checks each of the five
///         lessons on chain (every lesson unlocks the next, nothing is self-reported) and records learners who
///         graduate after passing all five. There are no tokens and no payments. The only admin power is sweep(),
///         which sends out the BOT that learners tip in lesson 2.
contract FirstBlock {
    uint256 public constant TIP_MIN = 0.001 ether;
    uint256 public constant NAME_MAX = 24;
    uint256 public constant NOTE_MAX = 80;
    uint8 private constant ALL_LESSONS = 31;

    struct Grad {
        address wallet;
        string note;
        uint64 at;
    }

    /// Bit i (0-based) is set once lesson i + 1 is passed.
    mapping(address => uint8) public lessonsDone;
    mapping(address => address) public counterOf;
    uint256[5] private _finished;

    Grad[] public grads;
    /// Position of a wallet in grads plus one, so 0 means "not a graduate".
    mapping(address => uint256) public gradId;

    bytes32 public immutable counterCodeHash;
    address public immutable owner;

    event LessonDone(address indexed learner, uint8 lesson);
    event Hello(address indexed learner, string name);
    event Graduated(uint256 indexed id, address indexed wallet);

    error NotDone(uint8 lesson);
    error NoGas();
    error TipTooSmall();
    error BadName();
    error NotACounter();
    error NotYourCounter();
    error CountTooLow(uint256 count);
    error NotFinished(uint8 passed);
    error AlreadyGraduated();
    error NoteTooLong();
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

    /// Lesson 2: send at least 0.001 BOT to this contract.
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

    /// Graduation: only for wallets that passed all five lessons, once per wallet, with an optional note.
    function graduate(string calldata note) external {
        if (gradId[msg.sender] != 0) revert AlreadyGraduated();
        if (lessonsDone[msg.sender] != ALL_LESSONS) revert NotFinished(_count(lessonsDone[msg.sender]));
        if (bytes(note).length > NOTE_MAX) revert NoteTooLong();
        grads.push(Grad(msg.sender, note, uint64(block.timestamp)));
        uint256 id = grads.length;
        gradId[msg.sender] = id;
        emit Graduated(id, msg.sender);
    }

    /// How many lessons the wallet has passed (0 to 5) and the raw bit flags.
    function progressOf(address who) external view returns (uint8 done, uint8 flags) {
        flags = lessonsDone[who];
        done = _count(flags);
    }

    /// How many wallets have passed each lesson.
    function stats() external view returns (uint256[5] memory) {
        return _finished;
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

    /// BOT sent in lesson 2 stays here. The owner can send it out to any address.
    function sweep(address payable to) external {
        if (msg.sender != owner) revert NotOwner();
        (bool ok, ) = to.call{value: address(this).balance}("");
        if (!ok) revert SweepFailed();
    }

    function _count(uint8 flags) private pure returns (uint8 done) {
        for (uint8 i = 0; i < 5; i++) {
            if (flags & (1 << i) != 0) done++;
        }
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
