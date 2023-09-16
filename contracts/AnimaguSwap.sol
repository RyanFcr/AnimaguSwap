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
    bytes32 public _commitWV;

    bytes32 public revealedB; // 新增的状态变量，用于存储b的值

    // 合约不应该知道谁是user
    constructor() {}

    function deposit(uint256 _amount) external payable override returns (bool) {
        require(_amount > 0, "Invalid deposit amount");
        // 将资金转移到合约
        require(msg.value == _amount, "Sent value doesn't match the deposit");

        deposits[msg.sender] += _amount;
        return true;
    }

    function commit(
        bytes32 hashTx,
        bytes32 hashWV
    ) external override returns (bool) {
        _commitTx = hashTx;
        _commitWV = hashWV;
        return true;
    }

    function revealStaker(
        bytes32 share,
        bytes32[] memory proof
    ) external payable override returns (bool) {
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
        bytes32 _b
    ) external payable override returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );

        revealedB = _b; // 将输入的b存储到状态变量中
        payable(msg.sender).transfer(deposits[msg.sender]);
        deposits[msg.sender] = 0;
        emit FlipperRevealed(msg.sender, true);

        return true;
    }
}
