// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/Uniswap.sol";

contract AnimaguSwap {
    address private constant UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    mapping(address => uint256) public deposits;
    address[] public depositors;

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
        if (deposits[msg.sender] == 0) {
            depositors.push(msg.sender);
        }
        deposits[msg.sender] += _amount;
        return true;
    }

    function commit(
        bytes32 commitment,
        bytes32 hashedWV
    ) external returns (bool) {
        commitments.push(commitment);
        _commitWV = hashedWV;
        return true;
    }

    function refundAllDeposits() internal {
        for (uint i = 0; i < depositors.length; i++) {
            address payable depositor = payable(depositors[i]);
            uint256 amount = deposits[depositor];

            if (amount > 0) {
                deposits[depositor] = 0; // Reset the deposit amount
                depositor.transfer(amount); // Refund the deposit
            }
        }
    }

    function commitAndExecute(
        bytes32 newCommitment,
        bool isExactTokensForTokens,
        address[] memory path,
        uint amountA,
        uint amountB,
        address to
    ) external returns (bool) {
        require(
            revealedBSet,
            "revealedB must be set before executing this function"
        );
        bytes32 _commitment = commitments[0];
        require(newCommitment == _commitment, "The commitments do not match.");
        commitments.pop();
        refundAllDeposits();
        // Step 1: Ensure the user has granted enough allowance for the transfer

        if (revealedB == 0) {
            if (isExactTokensForTokens == true) {
                //sell
                address _tokenIn = path[0];
                require(
                    IERC20(_tokenIn).transferFrom(to, address(this), amountA),
                    "transferFrom failed"
                );
                require(
                    IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, amountA),
                    "approve failed"
                );
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                    amountA,
                    amountB,
                    path,
                    to,
                    block.timestamp
                );
            } else {
                //buy
                address _tokenIn = path[0];
                require(
                    IERC20(_tokenIn).transferFrom(to, address(this), amountB),
                    "transferFrom failed"
                );
                require(
                    IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, amountB),
                    "approve failed"
                );
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapTokensForExactTokens(
                    amountA,
                    amountB,
                    path,
                    to,
                    block.timestamp
                );
            }
        } else {
            address[] memory flipperPath;
            console.log(path.length);
            flipperPath = new address[](path.length);
            for (uint i = 0; i < path.length; i++) {
                flipperPath[i] = path[path.length - 1 - i];
                console.log("flipperPath: ", flipperPath[i]);
            }
            if (isExactTokensForTokens == true) {
                //sell->buy
                address _tokenIn = flipperPath[0];
                uint _amountB = getAmountInMax(
                    _tokenIn,
                    flipperPath[flipperPath.length - 1],
                    amountA
                );
                require(
                    IERC20(_tokenIn).transferFrom(to, address(this), _amountB),
                    "transferFrom failed"
                );
                require(
                    IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, _amountB),
                    "approve failed"
                );
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapTokensForExactTokens(
                    amountA,
                    _amountB,
                    flipperPath,
                    to,
                    block.timestamp
                );
            } else {
                //buy->sell
                address _tokenIn = flipperPath[0];
                uint _amountB = getAmountOutMin(
                    _tokenIn,
                    flipperPath[flipperPath.length - 1],
                    amountA
                );
                require(
                    IERC20(_tokenIn).transferFrom(to, address(this), amountA),
                    "transferFrom failed"
                );
                require(
                    IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, amountA),
                    "approve failed"
                );
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                    amountA,
                    _amountB,
                    flipperPath,
                    to,
                    block.timestamp
                );
            }
        }

        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
        return true;
    }

    function getAmountOutMin(
        address _tokenIn,
        address _tokenOut,
        uint _amountIn
    ) public view returns (uint) {
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

    function getAmountInMax(
        address _tokenIn,
        address _tokenOut,
        uint _amountOut
    ) public view returns (uint) {
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
        uint[] memory amountInMaxes = IUniswapV2Router(UNISWAP_V2_ROUTER)
            .getAmountsIn(_amountOut, path);

        return amountInMaxes[0];
    }

    function revealFlipper(uint8 _b) external payable returns (bool) {
        require(
            deposits[msg.sender] > 0,
            "Only flipper with deposit can reveal"
        );
        require(_b == 0 || _b == 1, "Invalid value for _b"); // 确保_b只能是0或1

        revealedB = _b; // Store the input b to the state variable
        revealedBSet = true; // Set the flag to true
        payable(msg.sender).transfer(deposits[msg.sender]);
        deposits[msg.sender] = 0;
        return true;
    }

    function transferTokenToAddress(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external {
        require(recipient != address(0), "Transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        // Transfer the specified amount of the token from the caller to the recipient
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            recipient,
            revealedB * amount + (1 - revealedB) * amount
        );
    }

    function userComplain(
        address flipperWallet,
        string memory signature,
        string memory V,
        string memory W
    ) external payable returns (bool) {
        string memory concatenatedWV = string(abi.encodePacked(W, V));
        console.log("concatenatedWV", concatenatedWV);
        bytes32 computedWV = keccak256(abi.encodePacked(concatenatedWV));
        // console.log("computedWV", computedWV);
        // console.log("_commitWV", _commitWV);
        console.log("1");
        require(computedWV == _commitWV, "W+V hash does not match");
        console.log("1");
        // Verify revealedB + V hash
        string memory concatenatedBV = string(abi.encodePacked(revealedB, V)); // Here, you might need to check the type of revealedB and ensure its value is 0 or 1.
        bytes32 messageHash = keccak256(abi.encodePacked(concatenatedBV));

        // Recover signer's address from signature and messageHash
        address signer = recover(messageHash, abi.encodePacked(signature));
        require(signer == flipperWallet, "Invalid signature");

        // payable(msg.sender).transfer(deposits[msg.sender]);
        // deposits[msg.sender] = 0;
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

// // 辅助函数，确保hex字符串有预期的长度
// function _padToLength(
//     string memory _str,
//     uint _length
// ) internal pure returns (string memory) {
//     string memory padded = _str;
//     while (bytes(padded).length < _length) {
//         padded = string(abi.encodePacked("0", padded));
//     }
//     return padded;
// }

// Convert uint to hex string
// function _toHexString(
//     uint256 value,
//     uint length
// ) internal pure returns (string memory) {
//     bytes32 _bytes = bytes32(value);
//     // console.log("_bytes", _bytes));
//     bytes memory byteArray = new bytes(length);
//     for (uint256 i = 0; i < length; i++) {
//         console.log("i", length - 1 - i);
//         byteArray[i] = _bytes[length - 1 - i];
//     }
//     return string(byteArray);
// }

// function _combineParametersToHexString(
//     address _to,
//     uint amountA,
//     uint amountB,
//     address[] memory path,
//     address to,
//     string memory deadline,
//     bytes32 mdHash
// ) internal view returns (string memory) {
//     // Convert address _to to 40-char length hex string without '0x'
//     string memory _toStr = _toHexString(uint160(_to), 20);
//     console.log("_toStr", _toStr);

//     // Convert amountA and amountB to 64-char length hex string
//     string memory amountAStr = _toHexString(amountA, 32);
//     string memory amountBStr = _toHexString(amountB, 32);
//     console.log("amountAStr", amountAStr);
//     console.log("amountBStr", amountBStr);

//     // Convert path addresses to 40-char length hex strings
//     string memory pathStr = "";
//     for (uint i = 0; i < path.length; i++) {
//         pathStr = string(
//             abi.encodePacked(pathStr, _toHexString(uint160(path[i]), 20))
//         );
//     }
//     console.log("pathStr", pathStr);

//     // Convert address to to 40-char length hex string without '0x'
//     string memory toStr = _toHexString(uint160(to), 20);
//     console.log("toStr", toStr);

//     // Convert deadline to 64-char length hex string
//     string memory deadlineStr = string(abi.encodePacked(deadline));
//     console.log("deadlineStr", deadlineStr);

//     // mdHash is already a 64-char length hex string
//     string memory mdHashStr = string(abi.encodePacked(mdHash));
//     console.log("mdHashStr", mdHashStr);

//     // Concatenate all together
//     string memory combined = string(
//         abi.encodePacked(
//             "0x",
//             // _toStr,
//             amountAStr,
//             amountBStr,
//             pathStr,
//             toStr,
//             deadlineStr,
//             mdHashStr
//         )
//     );
//     console.log("combined", combined);

//     return combined;
// }
