// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IAnimaguSwap} from "./IAnimaguSwap.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// 定义Uniswap合约的接口
interface IUniswap {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract AnimaguSwap is IAnimaguSwap {
    event SecretRecovered(string secret);
    event TransactionExecuted(address indexed to, bytes data, bool success);
    event LogHash(bytes32 indexed hashValue);

    using MerkleProof for bytes32[];
    mapping(address => uint256) public deposits;

    // Records the commit hash for each participant
    bytes32 public _commitWV;

    uint8 public revealedB; // New state variable to store the value of b

    // Commitment queue to control transaction order
    bytes32[] public commitments;

    constructor() {}

    function deposit(uint256 _amount) external payable override returns (bool) {
        require(_amount > 0, "Invalid deposit amount");
        require(msg.value == _amount, "Sent value doesn't match the deposit");
        deposits[msg.sender] += _amount;
        return true;
    }

    function commit(bytes32 commitment) external override returns (bool) {
        commitments.push(commitment);
        return true;
    }

    function commitAndExecute(
        bytes32 newCommitment,
        string memory txbAsString
    ) external returns (bool) {
        bytes32 _commitment = commitments[0];
        require(newCommitment == _commitment, "The commitments do not match.");
        commitments.pop();

        // 解码 txbAsString
        address to = parseToFromTxb(txbAsString);
        bytes memory data = parseDataFromTxb(txbAsString);

        (
            bool isExactTokensForTokens,
            uint amountA,
            uint amountB,
            address[] memory path,
            address toAddress,
            uint deadline
        ) = decodeData(data);

        IUniswap uniswap = IUniswap(to);

        if (isExactTokensForTokens) {
            uniswap.swapExactTokensForTokens(
                amountA,
                amountB,
                path,
                toAddress,
                deadline
            );
        } else {
            uniswap.swapTokensForExactTokens(
                amountA,
                amountB,
                path,
                toAddress,
                deadline
            );
        }

        return true;
    }

    function parseToFromTxb(
        string memory txbAsString
    ) internal pure returns (address) {
        //... 解码得到 to
    }

    function parseDataFromTxb(
        string memory txbAsString
    ) internal pure returns (bytes memory) {
        //... 解码得到 data
    }

    function decodeData(
        bytes memory data
    )
        internal
        pure
        returns (bool, uint, uint, address[] memory, address, uint)
    {
        // 使用Uniswap的ABI对data进行解码，得到函数名和参数
    }

    function revealFlipper(uint8 _b) external payable override returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );

        revealedB = _b; // Store the input b to the state variable
        // payable(msg.sender).transfer(deposits[msg.sender]);
        // deposits[msg.sender] = 0;
        return true;
    }

    function revealStaker(
        // As the number of stakers increases, so does the gas fee
        string memory share,
        bytes32[] memory proof
    ) external payable override returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only stakers with deposits can reveal"
        );

        // Use the MerkleProof library's verify function for verification
        // bool isValidProof = MerkleProof.verify(proof, _commitTx, hashedShare);

        // if (isValidProof) {
        //     payable(msg.sender).transfer(deposits[msg.sender]);
        //     deposits[msg.sender] = 0;
        // } else {
        //     deposits[msg.sender] = 0; // Burn the deposit
        // }
        return true;
    }

    function recoverAndExecute(
        string memory buyTx,
        string memory sellTx
    ) external payable override {
        // string memory secret = removeLeadingZerosFromSecondPosition(
        //     recoverSecret(sharesArray)
        // );
        // emit SecretRecovered(secret);
        // shareCounter = 0;
        // bytes32 recoveredHash = keccak256(abi.encodePacked(secret));
        // bytes32 buyTxHash = keccak256(abi.encodePacked(buyTx));
        // emit LogHash(recoveredHash);
        // bytes32 _commitment = commitments[0];
        // if (recoveredHash == _commitment) {
        //     // Already verified
        //     commitments.pop();
        //     string memory transaction;
        //     if (revealedB == 1) {
        //         if (recoveredHash == buyTxHash) {
        //             transaction = sellTx;
        //         } else {
        //             transaction = buyTx;
        //         }
        //     } else {
        //         transaction = secret;
        //     }
        //     bytes memory txBytes = bytes(transaction);
        //     bytes memory to = new bytes(20);
        //     for (uint256 i = 0; i < 20; i++) {
        //         to[i] = txBytes[i];
        //     }
        //     address toAddress = address(bytes20(to));
        //     bytes memory data = new bytes(txBytes.length - 20);
        //     for (uint256 i = 20; i < txBytes.length; i++) {
        //         data[i - 20] = txBytes[i];
        //     }
        //     require(data.length > 0, "No transaction data");
        //     (bool success, ) = toAddress.call(data);
        //     emit TransactionExecuted(toAddress, data, success); // Emit an event
        //     require(success, "Transaction failed");
        //TODO Add TransactionF
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
        uint8 concatenatedBV = revealedB * 10 + V; // Here, you might need to check the type of revealedB and ensure its value is 0 or 1.
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
