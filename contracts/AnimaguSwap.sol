// SPDX-License-Identifier: MIT
import {IAnimaguSwap} from "./IAnimaguSwap.sol";
pragma solidity ^0.8.0;

contract AnimaguSwap is IAnimaguSwap {
    // 记录质押的资金
    mapping(address => uint256) public deposits;

    // 记录每个参与者的commit哈希值
    mapping(address => bytes32) public commits;

    // 内部状态
    enum Status {
        Deposited,
        Committed,
        Revealed,
        Slashed,
        Returned
    }
    mapping(address => Status) public statuses;

    constructor() {}

    function deposit(uint256 _amount) external payable override returns (bool) {
        require(_amount > 0, "Invalid deposit amount");
        // 将资金转移到合约
        require(msg.value == _amount, "Sent value doesn't match the deposit");

        deposits[msg.sender] += _amount;
        statuses[msg.sender] = Status.Deposited;

        return true;
    }

    function commit(bytes32 _hash) external override returns (bool) {
        require(
            statuses[msg.sender] == Status.Deposited,
            "Invalid status for commit"
        );

        commits[msg.sender] = _hash;
        statuses[msg.sender] = Status.Committed;

        return true;
    }

    function revealStaker(
        bytes[] calldata _txs
    ) external override returns (bool) {
        require(
            statuses[msg.sender] == Status.Committed,
            "Invalid status for reveal"
        );

        // TODO: 添加验证逻辑，例如验证_merkleProof是否与之前提交的commit哈希匹配
        // 还需要改

        statuses[msg.sender] = Status.Revealed;
        return true;
    }

    function revealFlipper(bytes32 _b) external override returns (bool) {
        require(
            statuses[msg.sender] == Status.Committed,
            "Invalid status for reveal"
        );

        // TODO: 添加验证逻辑，例如验证_b是否与之前提交的commit哈希匹配
        // 还需要改

        statuses[msg.sender] = Status.Revealed;
        return true;
    }

    function slash(
        address maliciousAddress
    ) external payable override returns (bool) {
        require(
            statuses[maliciousAddress] == Status.Revealed,
            "No deposit or already processed"
        );

        uint256 penaltyAmount = deposits[maliciousAddress];
        require(penaltyAmount > 0, "No funds to slash");

        deposits[maliciousAddress] = 0; // Reset the deposit to avoid re-entrancy attacks
        statuses[maliciousAddress] = Status.Slashed;

        payable(msg.sender).transfer(penaltyAmount); // Transfer the slashed funds to the caller

        return true;
    }

    function withdraw() external payable override returns (bool) {
        require(
            statuses[msg.sender] == Status.Revealed,
            "No deposit or already processed"
        );

        uint256 amount = deposits[msg.sender];
        require(amount > 0, "No funds to return");

        deposits[msg.sender] = 0; // Reset the deposit to avoid re-entrancy attacks
        statuses[msg.sender] = Status.Returned;

        payable(msg.sender).transfer(amount);

        return true;
    }
}
