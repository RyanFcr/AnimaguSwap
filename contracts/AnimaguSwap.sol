// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IAnimaguSwap} from "./IAnimaguSwap.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract AnimaguSwap is IAnimaguSwap {
    event StakerRevealed(address indexed staker, bool success);
    event FlipperRevealed(address indexed flipper, bool success);

    // 记录质押的资金
    using MerkleProof for bytes32[];
    mapping(address => uint256) public deposits;

    // 记录每个参与者的commit哈希值
    bytes32 public _commitTx;
    bytes32 public _commitB;
    address public user;
    address public flipper;
    bool public userCommitted = false; // 标记user是否commit了

    // 合约不应该知道谁是user
    constructor(address _user, address _flipper) {
        user = _user;
        flipper = _flipper;
    }

    function deposit(uint256 _amount) external payable override returns (bool) {
        require(_amount > 0, "Invalid deposit amount");
        // 将资金转移到合约
        require(msg.value == _amount, "Sent value doesn't match the deposit");

        deposits[msg.sender] += _amount;
        return true;
    }

    function commit(
        bytes32 hashTx,
        bytes32 hashB
    ) external override returns (bool) {
        require(msg.sender == user, "Only user can commit");

        _commitTx = hashTx;
        _commitB = hashB;
        userCommitted = true;
        return true;
    }

    function revealStaker(
        bytes32 share,
        bytes32[] memory proof
    ) external payable override returns (bool) {
        require(userCommitted, "User has not committed yet");
        require(
            deposits[msg.sender] > 0,
            "Only stakers with deposits can reveal"
        );

        // 使用MerkleProof库的verify函数验证
        bool isValidProof = MerkleProof.verify(proof, _commitTx, share);

        if (isValidProof) {
            payable(msg.sender).transfer(deposits[msg.sender]);
            deposits[msg.sender] = 0;
            emit StakerRevealed(msg.sender, true);
        } else {
            deposits[msg.sender] = 0; // Burn the deposit
            emit StakerRevealed(msg.sender, false);
        }
        return true;
    }

    function revealFlipper(
        bytes32 _hash
    ) external payable override returns (bool) {
        require(userCommitted, "User has not committed yet");
        require(msg.sender == flipper, "Only flipper can reveal");
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );
        if (_hash == _commitB) {
            payable(msg.sender).transfer(deposits[msg.sender]);
            deposits[msg.sender] = 0;
            emit FlipperRevealed(msg.sender, true);
        } else {
            deposits[msg.sender] = 0; // Burn the deposit
            emit FlipperRevealed(msg.sender, false);
        }
        return true;
    }
}
