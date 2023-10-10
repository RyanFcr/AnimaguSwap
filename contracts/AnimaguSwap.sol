// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// import {IAnimaguSwap} from "./IAnimaguSwap.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/Uniswap.sol";

contract AnimaguSwap {
    address private constant UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // address private constant UNISWAP_V2_ROUTER =
    //     0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98;

    // address private constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    // address private constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    // address private constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    // address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    mapping(address => uint256) public deposits;

    // Records the commit hash for each participant
    bytes32 public _commitWV;

    uint8 public revealedB; // New state variable to store the value of b
    bool public revealedBSet = false;
    // Commitment queue to control transaction order
    bytes32[] public commitments;

    constructor() {}

    function deposit(uint256 _amount) external payable returns (bool) {
        require(_amount > 0, "Invalid deposit amount");
        require(msg.value == _amount, "Sent value doesn't match the deposit");
        deposits[msg.sender] += _amount;
        return true;
    }

    function commit(bytes32 commitment) external returns (bool) {
        commitments.push(commitment);
        return true;
    }

    function commitAndExecute(
        bytes32 newCommitment,
        bool isExactTokensForTokens, // 使用这个布尔值来决定调用哪个函数
        address _tokenIn,
        address _tokenOut,
        uint amountA,
        uint amountB,
        // address[] memory path,
        address to
    ) external returns (bool) {
        require(
            revealedBSet,
            "revealedB must be set before executing this function"
        );
        bytes32 _commitment = commitments[0];
        require(newCommitment == _commitment, "The commitments do not match.");
        commitments.pop();

        // Step 1: Ensure the user has granted enough allowance for the transfer

        require(
            IERC20(_tokenIn).transferFrom(to, address(this), amountA),
            "transferFrom failed"
        );
        require(
            IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, amountA),
            "approve failed"
        );
        console.log("1");
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH;
            path[2] = _tokenOut;
        }

        if (
            (isExactTokensForTokens && revealedB == 0) ||
            (!isExactTokensForTokens && revealedB == 1)
        ) {
            IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                amountA,
                amountB,
                path,
                to,
                block.timestamp
            );
        } else {
            //     router.swapExactTokensForTokens(
            //         amountA,
            //         amountB,
            //         path,
            //         msg.sender,
            //         block.timestamp
            // );
        }

        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
        // console.log("amounts: ", amounts[0]);
        // console.log("amounts: ", amounts[1]);
        return true;
    }

    function getAmountOutMin(
        address _tokenIn,
        address _tokenOut,
        uint _amountIn
    ) external view returns (uint) {
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH;
            path[2] = _tokenOut;
        }

        // same length as path
        uint[] memory amountOutMins = IUniswapV2Router(UNISWAP_V2_ROUTER)
            .getAmountsOut(_amountIn, path);

        return amountOutMins[path.length - 1];
    }

    function revealFlipper(uint8 _b) external payable returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );
        require(_b == 0 || _b == 1, "Invalid value for _b"); // 确保_b只能是0或1

        revealedB = _b; // Store the input b to the state variable
        console.log("revealedB: ", revealedB);
        revealedBSet = true; // Set the flag to true
        payable(msg.sender).transfer(deposits[msg.sender]);
        deposits[msg.sender] = 0;
        return true;
    }

    function recoverAndExecute(
        string memory buyTx,
        string memory sellTx
    ) external payable {
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
    ) external payable returns (bool) {
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
