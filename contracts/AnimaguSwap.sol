// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/Uniswap.sol";

contract AnimaguSwap {
    address private constant UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    struct DepositorInfo {
        uint256 amount;
        bool exists;
    }

    mapping(address => DepositorInfo) private _deposits;

    // Records the commit hash for each participant
    string[] public commitWV;
    uint8[] public revealedB;
    uint8 public nowRevealedB;

    // Commitment queue to control transaction order
    bytes32[] public commitments;

    constructor() {}

    function deposit(uint256 _amount) external payable returns (bool) {
        require(_amount > 0, "Invalid deposit amount");
        require(msg.value == _amount, "Sent value doesn't match the deposit");

        DepositorInfo storage depositor = _deposits[msg.sender];
        if (!depositor.exists) {
            depositor.exists = true;
        }
        depositor.amount += _amount;

        return true;
    }

    function refundMyDeposit() public {
        DepositorInfo storage depositor = _deposits[msg.sender];
        require(
            depositor.exists && depositor.amount > 0,
            "No deposit to refund"
        );

        uint256 amount = depositor.amount;
        depositor.amount = 0; // Reset the deposit amount
        depositor.exists = false; // Reset the existence flag

        payable(msg.sender).transfer(amount);
    }

    function commit(bytes32 commitment) external returns (bool) {
        commitments.push(commitment);
        return true;
    }

    function extractSubstring(
        bytes memory strBytes,
        uint startIdx,
        uint endIdx
    ) internal pure returns (string memory) {
        bytes memory result = new bytes(endIdx - startIdx + 1);

        for (uint i = 0; i <= endIdx - startIdx; i++) {
            result[i] = strBytes[startIdx + i];
        }

        return string(result);
    }

    function stringToAddress(
        string memory _address
    ) public pure returns (address) {
        string memory cleanAddress = remove0xPrefix(_address);
        bytes20 _addressBytes = parseHexStringToBytes20(cleanAddress);
        return address(_addressBytes);
    }

    function remove0xPrefix(
        string memory _hexString
    ) internal pure returns (string memory) {
        if (
            bytes(_hexString).length >= 2 &&
            bytes(_hexString)[0] == "0" &&
            (bytes(_hexString)[1] == "x" || bytes(_hexString)[1] == "X")
        ) {
            return substring(_hexString, 2, bytes(_hexString).length);
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
        bytes memory _inputBytes = bytes(transaction);
        uint count = 1; // at least 1 string even if no commas
        for (uint i = 0; i < _inputBytes.length; i++) {
            if (_inputBytes[i] == ",") {
                count++;
            }
        }

        string[] memory parts = new string[](count);
        uint j = 0; // part index
        uint start = 0;
        for (uint i = 0; i < _inputBytes.length; i++) {
            if (_inputBytes[i] == ",") {
                parts[j++] = extractSubstring(_inputBytes, start, i - 1);
                start = i + 1;
            }
        }
        parts[j] = extractSubstring(_inputBytes, start, _inputBytes.length - 1);
        return parts;
    }

    // 提取路径创建逻辑
    function createPath(
        address token1,
        address token2,
        address _WETH,
        bool isExact
    ) internal pure returns (address[] memory) {
        address[] memory path = new address[](3); // 最大长度为3
        if (isExact == true) {
            if (
                keccak256(abi.encodePacked(token1)) ==
                keccak256(abi.encodePacked(_WETH)) ||
                keccak256(abi.encodePacked(token2)) ==
                keccak256(abi.encodePacked(_WETH))
            ) {
                path[0] = token1;
                path[1] = token2;
                return path;
            } else {
                path[0] = token1;
                path[1] = _WETH;
                path[2] = token2;
                return path;
            }
        } else {
            if (
                keccak256(abi.encodePacked(token1)) ==
                keccak256(abi.encodePacked(_WETH)) ||
                keccak256(abi.encodePacked(token2)) ==
                keccak256(abi.encodePacked(_WETH))
            ) {
                path[0] = token2;
                path[1] = token1;
                return path;
            } else {
                path[0] = token2;
                path[1] = _WETH;
                path[2] = token1;
                return path;
            }
        }
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

    function commitAndExecute(
        string memory transaction
    ) external returns (bool) {
        string[] memory parts = parseTransaction(transaction);

        string memory functionName = parts[0];
        uint amountA = stringToUint(parts[1]);
        uint amountB = stringToUint(parts[2]);
        address token1 = stringToAddress(parts[3]);
        address token2 = stringToAddress(parts[4]);
        address to = stringToAddress(parts[5]);
        uint deadline = stringToUint(parts[6]);
        string memory mdHash = parts[7];
        // console.log("stringToBytes32(mdHash)".stringToBytes32(mdHash));
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
        bytes32 _commitment = commitments[0];
        require(newCommitment == _commitment, "The commitments do not match.");
        commitments.pop();

        // Only call refundAllDeposits() if the queue is empty
        // refundAllDeposits();
        // Step 1: Ensure the user has granted enough allowance for the transfer

        uint8 _revealedB = revealedB[0];
        nowRevealedB = _revealedB;
        revealedB.pop();

        if (_revealedB == 0) {
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
                    deadline
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
                    deadline
                );
            }
        } else {
            address[] memory flipperPath;
            console.log(path.length);
            flipperPath = new address[](path.length);
            for (uint i = 0; i < path.length; i++) {
                flipperPath[i] = path[path.length - 1 - i];
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
                    deadline
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
                    deadline
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
        require(_b == 0 || _b == 1, "Invalid value for _b");

        revealedB.push(_b); // Store the input b to the state variable

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
            nowRevealedB * amount + (1 - nowRevealedB) * amount
        );
    }

    function bytes32ToHexString(
        bytes32 _bytes32
    ) public pure returns (string memory) {
        bytes memory byteArray = new bytes(64);
        for (uint i = 0; i < 32; i++) {
            bytes1 currentByte = _bytes32[i];
            bytes1 hi = bytes1(uint8(currentByte) / 16);
            bytes1 lo = bytes1(uint8(currentByte) - 16 * uint8(hi));
            byteArray[i * 2] = char(hi);
            byteArray[1 + i * 2] = char(lo);
        }
        return string(byteArray);
    }

    function char(bytes1 b) private pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function userComplain(
        address flipperAddress,
        string memory signature,
        string memory V,
        string memory W
    ) external payable returns (bool) {
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
        console.log(nowRevealedB);
        console.log("concatenatedBV", concatenatedBV);
        // bytes32 messageHash = keccak256(abi.encodePacked(concatenatedBV));

        // Recover signer's address from signature and messageHash
        address signer = recover(concatenatedBV, signature);
        console.log("flipperAddress", flipperAddress);
        console.log("signer", signer);
        // require(signer == flipperAddress, "Invalid signature");

        return true;
    }

    function recover(
        string memory message,
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

    function hexToBytes(string memory _hex) public pure returns (bytes memory) {
        bytes memory strBytes = bytes(_hex);
        require(strBytes.length % 2 == 0, "Invalid hex string length");

        bytes memory resultBytes = new bytes(strBytes.length / 2);

        for (uint256 i = 0; i < strBytes.length; i += 2) {
            resultBytes[i / 2] = byteFromHexChar(strBytes[i], strBytes[i + 1]);
        }

        return resultBytes;
    }

    function byteFromHexChar(
        bytes1 _char1,
        bytes1 _char2
    ) internal pure returns (bytes1) {
        return
            bytes1(
                (uint8(fromHexChar(_char1)) << 4) | uint8(fromHexChar(_char2))
            );
    }

    function fromHexChar(bytes1 _char) internal pure returns (uint8) {
        if (uint8(_char) >= 48 && uint8(_char) <= 57) {
            return uint8(_char) - 48; // 0-9
        }
        if (uint8(_char) >= 97 && uint8(_char) <= 102) {
            return 10 + uint8(_char) - 97; // a-f
        }
        if (uint8(_char) >= 65 && uint8(_char) <= 70) {
            return 10 + uint8(_char) - 65; // A-F
        }
        revert("Invalid hex char");
    }
}
