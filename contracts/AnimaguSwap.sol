// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/Uniswap.sol";

contract AnimaguSwap {
    address private immutable UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private immutable WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    mapping(address => uint256) private _deposits;

    // Records the commit hash for each participant
    string[] public commitWV;
    uint8[] public revealedB;
    uint8 public nowRevealedB;

    // Commitment queue to control transaction order
    bytes32[] public commitments;

    constructor() {}

    function deposit(uint256 _amount) external payable {
        require(_amount > 0, "Invalid deposit amount");
        if (msg.value > 0) {
            _deposits[msg.sender] += msg.value;
        }
    }

    function refundDeposit() public {
        uint256 amount = _deposits[msg.sender];
        if (amount > 0) {
            _deposits[msg.sender] = 0;
            payable(msg.sender).transfer(amount);
        }
    }

    function commit(bytes32 commitment) external {
        commitments.push(commitment);
    }

    function stringToAddress(
        string memory _address
    ) public pure returns (address) {
        return address(parseHexStringToBytes20(remove0xPrefix(_address)));
    }

    function remove0xPrefix(
        string memory _hexString
    ) internal pure returns (string memory) {
        bytes memory b = bytes(_hexString);
        if (b.length >= 2 && b[0] == 0x30 && (b[1] == 0x78 || b[1] == 0x58)) {
            return substring(_hexString, 2, b.length);
        }
        return _hexString;
    }

    function substring(
        string memory _str,
        uint256 _start,
        uint256 _end
    ) internal pure returns (string memory) {
        bytes memory _strBytes = bytes(_str);
        bytes memory _result = new bytes(_end - _start);
        for (uint256 i = _start; i < _end; i++) {
            _result[i - _start] = _strBytes[i];
        }
        return string(_result);
    }

    function parseHexStringToBytes20(
        string memory _hexString
    ) internal pure returns (bytes20) {
        bytes memory _bytesString = bytes(_hexString);
        uint160 _parsedBytes = 0;
        for (uint256 i = 0; i < _bytesString.length; i += 2) {
            _parsedBytes *= 256;
            uint8 _byteValue = parseByteToUint8(_bytesString[i]);
            _byteValue *= 16;
            _byteValue += parseByteToUint8(_bytesString[i + 1]);
            _parsedBytes += _byteValue;
        }
        return bytes20(_parsedBytes);
    }

    function parseByteToUint8(bytes1 _byte) internal pure returns (uint8) {
        if (uint8(_byte) >= 48 && uint8(_byte) <= 57) {
            return uint8(_byte) - 48;
        } else if (uint8(_byte) >= 65 && uint8(_byte) <= 70) {
            return uint8(_byte) - 55;
        } else if (uint8(_byte) >= 97 && uint8(_byte) <= 102) {
            return uint8(_byte) - 87;
        } else {
            revert(string(abi.encodePacked("Invalid byte value: ", _byte)));
        }
    }

    function parseTransaction(
        string memory transaction
    ) internal pure returns (string[] memory) {
        bytes memory transactionBytes = bytes(transaction);
        uint256 count = 1;
        for (uint256 i = 0; i < transactionBytes.length; i++) {
            if (transactionBytes[i] == ",") {
                count++;
            }
        }

        string[] memory parts = new string[](count);
        uint256 index = 0;
        uint256 start = 0;
        for (uint256 i = 0; i < transactionBytes.length; i++) {
            if (transactionBytes[i] == ",") {
                parts[index] = substring(transaction, start, i);
                start = i + 1;
                index++;
            }
        }

        if (start <= transactionBytes.length) {
            parts[index] = substring(
                transaction,
                start,
                transactionBytes.length
            );
        }

        return parts;
    }

    function createPath(
        address token1,
        address token2,
        address _WETH,
        bool isExact
    ) internal pure returns (address[] memory) {
        bytes32 hashToken1 = keccak256(abi.encodePacked(token1));
        bytes32 hashToken2 = keccak256(abi.encodePacked(token2));
        bytes32 hashWETH = keccak256(abi.encodePacked(_WETH));

        bool isToken1WETH = hashToken1 == hashWETH;
        bool isToken2WETH = hashToken2 == hashWETH;

        uint256 pathLength = isToken1WETH || isToken2WETH ? 2 : 3;
        address[] memory path = new address[](pathLength);

        if (isExact) {
            if (isToken1WETH || isToken2WETH) {
                path[0] = token1;
                path[1] = token2;
            } else {
                path[0] = token1;
                path[1] = _WETH;
                path[2] = token2;
            }
        } else {
            if (isToken1WETH || isToken2WETH) {
                path[0] = token2;
                path[1] = token1;
            } else {
                path[0] = token2;
                path[1] = _WETH;
                path[2] = token1;
            }
        }
        return path;
    }

    function stringToUint(string memory s) internal pure returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint256 c = uint256(uint8(b[i]));
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }

    function revealStaker(string memory transaction) external {
        string[] memory parts = parseTransaction(transaction);

        string memory functionName = parts[0];
        uint256 amountA = stringToUint(parts[1]);
        uint256 amountB = stringToUint(parts[2]);
        address token1 = stringToAddress(parts[3]);
        address token2 = stringToAddress(parts[4]);
        address to = stringToAddress(parts[5]);
        uint256 deadline = stringToUint(parts[6]);
        string memory mdHash = parts[7];
        commitWV.push(mdHash);

        bool isExactTokensForTokens = keccak256(
            abi.encodePacked(functionName)
        ) == keccak256(abi.encodePacked("swapExactTokensForTokens"));
        address[] memory path = createPath(
            token1,
            token2,
            WETH,
            isExactTokensForTokens
        );
        bytes32 newCommitment = keccak256(abi.encodePacked(transaction));
        require(
            newCommitment == commitments[0],
            "The commitments do not match."
        );
        commitments.pop();

        // Only call refundAllDeposits() if the queue is empty
        // refundAllDeposits();
        // Step 1: Ensure the user has granted enough allowance for the transfer

        nowRevealedB = revealedB[0];
        revealedB.pop();

        if (nowRevealedB == 0) {
            address _tokenIn = path[0];
            uint256 amountToken;
            if (isExactTokensForTokens) {
                amountToken = amountA;
            } else {
                amountToken = amountB;
            }
            require(
                IERC20(_tokenIn).transferFrom(to, address(this), amountToken),
                "transferFrom failed"
            );
            require(
                IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, amountToken),
                "approve failed"
            );

            if (isExactTokensForTokens) {
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                    amountA,
                    amountB,
                    path,
                    to,
                    deadline
                );
            } else {
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapTokensForExactTokens(
                    amountA,
                    amountB,
                    path,
                    to,
                    deadline
                );
            }
        } else {
            address[] memory flipperPath = new address[](path.length);

            for (uint256 i = 0; i < path.length; i++) {
                flipperPath[i] = path[path.length - 1 - i];
            }

            uint256 _amountB;

            address _tokenIn = flipperPath[0];
            require(
                IERC20(_tokenIn).transferFrom(to, address(this), amountA),
                "transferFrom failed"
            );
            require(
                IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, amountA),
                "approve failed"
            );

            if (isExactTokensForTokens) {
                //sell->buy
                _amountB = getAmountInMax(
                    _tokenIn,
                    flipperPath[flipperPath.length - 1],
                    amountA
                );
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapTokensForExactTokens(
                    amountA,
                    _amountB,
                    flipperPath,
                    to,
                    deadline
                );
            } else {
                //buy->sell
                _amountB = getAmountOutMin(
                    _tokenIn,
                    flipperPath[flipperPath.length - 1],
                    amountA
                );
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                    amountA,
                    _amountB,
                    flipperPath,
                    to,
                    deadline
                );
            }
        }

        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    function getAmountOutMin(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
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

        uint256[] memory amountOutMins = IUniswapV2Router(UNISWAP_V2_ROUTER)
            .getAmountsOut(_amountIn, path);

        return amountOutMins[path.length - 1];
    }

    function getAmountInMax(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut
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

        uint256[] memory amountInMaxes = IUniswapV2Router(UNISWAP_V2_ROUTER)
            .getAmountsIn(_amountOut, path);

        return amountInMaxes[0];
    }

    function revealFlipper(uint8 _b) external payable {
        revealedB.push(_b);
    }

    function transactionF(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external {
        require(recipient != address(0), "Transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        IERC20(tokenAddress).transferFrom(
            msg.sender,
            recipient,
            nowRevealedB * amount + (1 - nowRevealedB) * amount
        );
    }

    bytes16 private constant _HEX_SYMBOLS = "0123456789abcdef";

    function bytes32ToHexString(
        bytes32 _bytes32
    ) public pure returns (string memory) {
        bytes memory buffer = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            uint8 value = uint8(_bytes32[i]);
            buffer[i * 2] = _HEX_SYMBOLS[value >> 4];
            buffer[i * 2 + 1] = _HEX_SYMBOLS[value & 0x0F];
        }
        return string(buffer);
    }

    function complain(
        address flipperAddress,
        string memory signature,
        string memory V,
        string memory W
    ) external payable {
        string memory concatenatedWV = string.concat(W, V);
        bytes32 computedWV = keccak256(abi.encodePacked(concatenatedWV));
        string memory hexComputedWV = bytes32ToHexString(computedWV);
        string memory _commitWV = commitWV[0];
        commitWV.pop();
        require(
            keccak256(abi.encodePacked(_commitWV)) ==
                keccak256(abi.encodePacked(string.concat("0x", hexComputedWV))),
            "W+V hash does not match"
        );
        // Verify revealedB + V hash
        string memory concatenatedBV = string.concat(
            Strings.toString(nowRevealedB),
            V
        ); // Here, you might need to check the type of revealedB and ensure its value is 0 or 1.
        // Recover signer's address from signature and messageHash
        address signer = recover(concatenatedBV, signature);
        // address signer = recover(messageHash, signature);
        require(signer == flipperAddress, "Invalid signature");
    }

    function recover(
        string memory message,
        // bytes32 messageHash,
        string memory signature
    ) internal pure returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes memory signatureBytes = hexToBytes(signature);

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Check the signature length
        if (signatureBytes.length != 65) {
            return address(0);
        }

        // Divide the signature into r, s, and v variables
        assembly {
            r := mload(add(signatureBytes, 0x20))
            s := mload(add(signatureBytes, 0x40))
            v := byte(0, mload(add(signatureBytes, 0x60)))
        }

        // Version of the signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is incorrect, return the zero address
        if (v != 27 && v != 28) {
            return address(0);
        } else {
            // ecrecover takes the message hash, and v, r, s values as inputs
            return ecrecover(messageHash, v, r, s);
        }
    }

    function hexToBytes(
        string memory _hex
    ) internal pure returns (bytes memory) {
        // 获取字节长度，而非整个字符串的长度，直接计算结果数组大小
        uint256 bytesLength = bytes(_hex).length / 2;
        bytes memory resultBytes = new bytes(bytesLength);

        // 删除额外的变量，直接在循环中处理字符转换
        for (uint256 i = 0; i < bytesLength; i++) {
            uint8 highNibble = charToNibble(uint8(bytes(_hex)[2 * i]));
            uint8 lowNibble = charToNibble(uint8(bytes(_hex)[2 * i + 1]));

            // 直接在这里计算结果，避免调用额外的函数
            resultBytes[i] = bytes1((highNibble << 4) | lowNibble);
        }

        return resultBytes;
    }

    // 合并从字符到nibble的计算，避免多个函数调用
    function charToNibble(uint8 _char) internal pure returns (uint8 nibble) {
        // 计算nibble值，合并原来`fromHexChar`的逻辑
        if (_char >= 48 && _char <= 57) {
            return _char - 48; // 对于0-9
        }
        if (_char >= 65 && _char <= 70) {
            return _char - 55; // 对于大写A-F
        }
        if (_char >= 97 && _char <= 102) {
            return _char - 87; // 对于小写a-f
        }

        revert("Invalid hex char"); // 输入不是有效的十六进制字符
    }
}
