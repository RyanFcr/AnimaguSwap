// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IAnimaguSwap} from "./IAnimaguSwap.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract AnimaguSwap is IAnimaguSwap {
    event StakerRevealed(address indexed staker, bool success);
    event FlipperRevealed(address indexed flipper, bool success);
    event SecretRecovered(string secret);
    event DebugUintArray(uint256[] value);
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
    // struct Commitment {
    //     address user;
    //     bytes32 commitHash;
    // }
    // uint256 public commitCounter = 0;
    // mapping(uint256 => Commitment) public commits;
    // commitment队列控制交易的顺序
    bytes32[] public commitments;
    bytes public transactionData;

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
        bytes32 hashWV,
        bytes32 commitment
    ) external override returns (bool) {
        _commitTx = hashTx;
        _commitWV = hashWV;
        commitments.push(commitment);
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
            // 增加计数
            shareCounter += 1;
            // 存储share
            sharesArray.push(share);
        } else {
            deposits[msg.sender] = 0; // Burn the deposit
            emit StakerRevealed(msg.sender, false);
        }
        return true;
    }

    function recoverAndExecute() external override {
        string memory secret = recoverSecret(sharesArray);
        emit SecretRecovered(secret);
        shareCounter = 0; // Note: You had '==' instead of '=', I corrected it.
        bytes32 recoveredHash = keccak256(abi.encodePacked(secret));
        bytes32 _commitment = commitments[0];
        if (recoveredHash == _commitment) {
            commitments.pop();
            // Here, execute the transaction as the hashes match.
            transactionData = abi.encode(secret);
            // 根据b去进行翻转
            executeTransaction();
        }
    }

    function recoverSecret(
        string[] memory shares
    ) public pure returns (string memory) {
        uint256[] memory sum = parseHexStringToBigInt(shares[0]);
        // emit DebugEvent("Value of sum is:", sum.segments[0]);

        for (uint256 i = 1; i < shares.length; i++) {
            uint256[] memory nextValue = parseHexStringToBigInt(shares[i]);
            sum = addBigInts(sum, nextValue);
        }

        return bigIntToHexString(sum);
    }

    function substring(
        string memory str,
        uint startIndex,
        uint endIndex
    ) public pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function parseHexStringToBigInt(
        string memory s
    ) public pure returns (uint256[] memory) {
        bytes memory b = bytes(substring(s, 2, bytes(s).length));
        uint256 current = 0;
        uint256 segmentIndex = 0;
        uint256[] memory result;

        // Initialize segments
        uint256 segmentCount = (b.length + 63) / 64;
        result = new uint256[](segmentCount);

        for (uint i = 0; i < b.length; i++) {
            uint8 tmp = uint8(b[i]);
            if (tmp >= 48 && tmp <= 57) {
                current = current * 16 + (tmp - 48);
            } else if (tmp >= 97 && tmp <= 102) {
                current = current * 16 + (tmp - 87);
            } else if (tmp >= 65 && tmp <= 70) {
                current = current * 16 + (tmp - 55);
            }

            if ((i + 1) % 64 == 0) {
                result[segmentIndex] = current;
                segmentIndex++;
                current = 0;
            }
        }

        if (b.length % 64 != 0) {
            result[segmentIndex] = current;
        }
        return result;
    }

    function addBigInts(
        uint256[] memory a,
        uint256[] memory b
    ) public pure returns (uint256[] memory) {
        uint256 maxLength = a.length > b.length ? a.length : b.length;
        uint256[] memory result;
        result = new uint256[](maxLength);
        uint256 carry = 0;

        for (uint256 i = 0; i < maxLength; i++) {
            uint256 segmentA = i < a.length ? a[i] : 0;
            uint256 segmentB = i < b.length ? b[i] : 0;
            uint256 sum = segmentA + segmentB + carry;
            result[i] = sum;
            if (sum < segmentA || sum < segmentB) {
                carry = 1;
            } else {
                carry = 0;
            }
        }
        return result;
    }

    function bigIntToHexString(
        uint256[] memory x
    ) public pure returns (string memory) {
        // Adjust the size of the byte array to account for the "0x" prefix
        bytes memory b = new bytes(x.length * 64 + 2);

        // Set the "0x" prefix
        b[0] = bytes1(uint8(48)); // ASCII for "0"
        b[1] = bytes1(uint8(120)); // ASCII for "x"

        for (
            uint256 segmentIndex = 0;
            segmentIndex < x.length;
            segmentIndex++
        ) {
            uint256 current = x[segmentIndex];
            for (uint i = 0; i < 64; i++) {
                uint8 tmp = uint8(current & 0xF);
                if (tmp < 10) {
                    b[65 - i + segmentIndex * 64] = bytes1(uint8(tmp + 48));
                } else {
                    b[65 - i + segmentIndex * 64] = bytes1(uint8(tmp + 87));
                }
                current = current >> 4;
            }
        }

        return string(b);
    }

    function executeTransaction() internal {
        require(transactionData.length > 0, "No transaction data");

        // 解析参数
        (address to, bytes memory data) = abi.decode(
            transactionData,
            (address, bytes)
        );

        // 调用call执行
        (bool success, ) = to.call(data);

        require(success, "Transaction failed");
    }

    function revealFlipper(uint8 _b) external payable override returns (bool) {
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
