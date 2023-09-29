// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IAnimaguSwap} from "./IAnimaguSwap.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// import "./Merkle.sol";

contract AnimaguSwap is IAnimaguSwap {
    event StakerRevealed(address indexed staker, bool success);
    event FlipperRevealed(address indexed flipper, bool success);

    // 记录质押的资金
    using MerkleProof for bytes32[];
    mapping(address => uint256) public deposits;

    // 记录每个参与者的commit哈希值
    bytes32 public _commitTx;
    bytes32 public _commitWV;

    uint8 public revealedB; // 新增的状态变量，用于存储b的值

    // 新增的计数器状态变量
    uint256 public shareCounter = 0;

    // 新增一个状态变量用于存储所有的shares
    string[] public sharesArray;

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
        string memory share,
        bytes32[] memory proof
    ) external payable override returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only stakers with deposits can reveal"
        );

        // 使用MerkleProof库的verify函数验证
        // 对原始数据进行哈希，得到固定大小的哈希值
        bytes32 hashedShare = keccak256(abi.encodePacked(share));

        // 使用MerkleProof库的verify函数验证
        bool isValidProof = MerkleProof.verify(proof, _commitTx, hashedShare);

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

    function revealFlipper(uint8 _b) external override returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );

        revealedB = _b; // 将输入的b存储到状态变量中
        emit FlipperRevealed(msg.sender, true);
        return true;
    }

    function userComplain(
        address flipperWallet,
        bytes32 signature,
        uint8 V,
        uint8 W
    ) external payable override returns (bool) {
        // Verify W + V hash
        require(W == 0 || W == 1, "W should be 0 or 1");
        require(V == 0 || V == 1, "V should be 0 or 1");

        uint8 concatenatedWV = W * 10 + V;
        bytes32 computedWV = keccak256(abi.encodePacked(concatenatedWV));
        require(computedWV == _commitWV, "W+V hash does not match");

        // Verify revealedB + V hash
        uint8 concatenatedBV = revealedB * 10 + V; // 这里可能需要检查revealedB的类型和确保其值是0或1。
        bytes32 messageHash = keccak256(abi.encodePacked(concatenatedBV));

        // Recover signer's address from signature and messageHash
        address signer = recover(messageHash, abi.encodePacked(signature));
        require(signer == flipperWallet, "Invalid signature");
        payable(msg.sender).transfer(deposits[msg.sender]);
        deposits[msg.sender] = 0;
        return true;
    }

    function recover(
        bytes32 hash,
        bytes memory signature
    ) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        // Check the signature length
        if (signature.length != 65) {
            return (address(0));
        }

        // Divide the signature into r, s, and v variables
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is correct (27 or 28) recover the signer address
        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            return ecrecover(hash, v, r, s);
        }
    }
}
