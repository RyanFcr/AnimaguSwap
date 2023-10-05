// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IAnimaguSwap} from "./IAnimaguSwap.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract AnimaguSwap is IAnimaguSwap {
    event SecretRecovered(string secret);
    event TransactionExecuted(address indexed to, bytes data, bool success);
    event LogHash(bytes32 indexed hashValue);

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
        require(msg.value == _amount, "Sent value doesn't match the deposit");
        deposits[msg.sender] += _amount;
        return true;
    }

    function commit(
        bytes32 hashTx,
        bytes32 hashWV,
        bytes32 commitment,
        uint N
    ) external override returns (bool) {
        _commitTx = hashTx;
        _commitWV = hashWV;
        commitments.push(commitment);
        sharesArray = new string[](N);
        return true;
    }

    function revealFlipper(uint8 _b) external payable override returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );

        revealedB = _b; // 将输入的b存储到状态变量中
        payable(msg.sender).transfer(deposits[msg.sender]);
        deposits[msg.sender] = 0;
        return true;
    }

    function revealStaker(
        //随着staker的增加，gas fee也在增加
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
            sharesArray[shareCounter] = share;
            shareCounter += 1;
            // 存储share
        } else {
            deposits[msg.sender] = 0; // Burn the deposit
        }
        return true;
    }

    function recoverAndExecute(
        string memory buyTx,
        string memory sellTx
    ) external override {
        string memory secret = removeLeadingZerosFromSecondPosition(
            recoverSecret(sharesArray)
        );
        // string
        // memory secret = "7b22746f223a22307838366463643332393343353343663845466437333033423537626562326133463637316444453938222c2264617461223a22307833386564313733393030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303861633732333034383965383030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303233383666323666633130303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303061303030303030303030303030303030303030303030303030306537663336336133353863376366303762386335396533643564653764653439346332316366643630303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303635316532636664303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030323030303030303030303030303030303030303030303030303166393834306138356435616635626631643137363266393235626461646463343230316639383430303030303030303030303030303030303030303030303066666639393736373832643436636330353633306431663665626162313862323332346436623134227d";
        emit SecretRecovered(secret);
        // console.log("secret: ", secret);
        shareCounter = 0;
        bytes32 recoveredHash = keccak256(abi.encodePacked(secret));
        bytes32 buyTxHash = keccak256(abi.encodePacked(buyTx));
        emit LogHash(recoveredHash);
        bytes32 _commitment = commitments[0];
        // bytes32 _commitment = 0x88b57e95d3d0bb7c392a9f6b04e8bcb8bc3465b6a2933c1390e434e003759af8;
        console.log(string(abi.encodePacked(recoveredHash)));
        console.log(string(abi.encodePacked(_commitment)));
        console.log("1");
        // if (recoveredHash == _commitment) {
        commitments.pop();
        console.log("commitments.pop()");
        if (revealedB == 1) {
            if (recoveredHash == buyTxHash) {
                transactionData = abi.encode(sellTx);
            } else {
                transactionData = abi.encode(buyTx);
            }
        } else {
            transactionData = abi.encode(secret);
        }
        console.log("transactionData", string(transactionData));
        // executeTransaction();
        // }
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
        emit TransactionExecuted(to, data, success); // 发出事件
        require(success, "Transaction failed");
    }

    function recoverSecret(
        string[] memory shares
    ) internal pure returns (string memory) {
        uint256[] memory sum = parseHexStringToBigInt(shares[0]); //with 0x
        for (uint256 i = 1; i < shares.length; i++) {
            uint256[] memory nextValue = parseHexStringToBigInt(shares[i]);
            sum = addBigInts(sum, nextValue);
        }

        return bigIntToHexString(sum);
    }

    function parseHexStringToBigInt(
        string memory s
    ) internal pure returns (uint256[] memory) {
        bytes memory b = bytes(s);
        uint256 current = 0;
        uint256 segmentIndex = 0;

        // 初始化segments
        uint256 segmentCount = (b.length + 63 - 2) / 64;
        uint256[] memory result = new uint256[](segmentCount);
        uint i = b.length - 1;
        uint charCount = 0; // 已经解析的字符计数

        while (i >= 2) {
            uint8 tmp = uint8(b[i]);
            uint256 value = 0;

            if (tmp >= 48 && tmp <= 57) {
                value = tmp - 48;
            } else if (tmp >= 97 && tmp <= 102) {
                value = tmp - 97 + 10;
            } else if (tmp >= 65 && tmp <= 70) {
                value = tmp - 65 + 10;
            }

            // 通过位移操作替代pow函数
            current |= value << (charCount * 4);
            charCount++;

            if (charCount == 64 || i == 2) {
                // 当我们解析了64个字符或到达字符串的开始时，保存当前的数值
                result[segmentIndex] = current;
                segmentIndex++;
                current = 0;
                charCount = 0;
            }

            if (i == 2) break; // 因为我们使用了 uint，所以需要这样来判断
            i--;
        }
        return result;
    }

    function addBigInts(
        uint256[] memory a,
        uint256[] memory b
    ) internal pure returns (uint256[] memory) {
        uint256 maxLength = a.length > b.length ? a.length : b.length; //如果长度相等，又有carry，需要maxLength+1
        uint256[] memory result;
        result = new uint256[](maxLength);
        uint256 carry = 0;

        for (uint256 i = 0; i < maxLength; i++) {
            uint256 segmentA = i < a.length ? a[i] : 0;
            uint256 segmentB = i < b.length ? b[i] : 0;
            unchecked {
                uint256 sum = segmentA + segmentB + carry;
                result[maxLength - i - 1] = sum;
                if (sum < segmentA || sum < segmentB) {
                    carry = 1;
                } else {
                    carry = 0;
                }
            }
        }
        return result;
    }

    function bigIntToHexString(
        uint256[] memory x
    ) internal pure returns (string memory) {
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

    function removeLeadingZerosFromSecondPosition(
        string memory input
    ) internal pure returns (string memory) {
        bytes memory b = bytes(input);

        // 如果长度小于2，直接返回
        if (b.length < 2) {
            return input;
        }

        uint startIndexOfZeros = 2;
        uint endIndexOfZeros = 2;

        // 找到从第二位开始的连续零的结束位置
        while (endIndexOfZeros < b.length && b[endIndexOfZeros] == "0") {
            endIndexOfZeros++;
        }

        // 如果没有找到连续的零，直接返回原字符串
        if (endIndexOfZeros == startIndexOfZeros) {
            return input;
        }

        // 构建一个新的字符串，没有连续的零
        bytes memory result = new bytes(
            b.length - (endIndexOfZeros - startIndexOfZeros)
        );
        uint index = 0;

        for (uint i = 0; i < b.length; i++) {
            if (i < startIndexOfZeros || i >= endIndexOfZeros) {
                result[index] = b[i];
                index++;
            }
        }
        return string(result);
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
