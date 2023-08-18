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
        Revealed
    }
    mapping(address => Status) public statuses;

    constructor() {}

    function deposit(uint256 _amount) external payable override returns (bool) {
        require(_amount > 0, "Invalid deposit amount");

        deposits[msg.sender] += _amount;
        statuses[msg.sender] = Status.Deposited;

        // 将资金转移到合约
        require(msg.value == _amount, "Sent value doesn't match the deposit");
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

        statuses[msg.sender] = Status.Revealed;
        return true;
    }

    function revealFlipper(bytes32 _b) external override returns (bool) {
        require(
            statuses[msg.sender] == Status.Committed,
            "Invalid status for reveal"
        );

        // TODO: 添加验证逻辑，例如验证_b是否与之前提交的commit哈希匹配

        statuses[msg.sender] = Status.Revealed;
        return true;
    }

    function slashStaker() external payable override returns (bool) {
        require(
            statuses[msg.sender] == Status.Committed,
            "Invalid status for slashing"
        );

        // 惩罚逻辑
        uint256 penalty = deposits[msg.sender] / 10; // 假设惩罚为10%的存款
        deposits[msg.sender] -= penalty;
        // 将惩罚的金额转移到另一个地址，例如flipper的地址

        return true;
    }

    function slashFlipper() external payable override returns (bool) {
        require(
            statuses[msg.sender] == Status.Committed,
            "Invalid status for slashing"
        );

        // 惩罚逻辑
        uint256 penalty = deposits[msg.sender] / 10; // 假设惩罚为10%的存款
        deposits[msg.sender] -= penalty;
        // 将惩罚的金额转移到另一个地址

        return true;
    }
}
