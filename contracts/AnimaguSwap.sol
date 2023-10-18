// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@ensdomains/dnssec-oracle/contracts/BytesUtils.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/Uniswap.sol";
import "../interfaces/BytesUtils.sol";

contract AnimaguSwap {
    using BytesUtils for bytes;

    address private immutable UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private immutable WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    mapping(address => uint256) private _deposits;

    // Records the commit hash for each participant
    bytes32[] public commitWV;
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

    function bytes32ToString(
        bytes32 _bytes32
    ) public pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    function revealStaker(bytes memory transaction) external {
        // string[] memory parts = parseTransaction(transaction);
        bytes32 functionName = transaction.readBytesN(0, 24); // 24 bytes
        uint256 amountA = uint256(transaction.readBytes32(24)); // 32 bytes
        uint256 amountB = uint256(transaction.readBytes32(56)); // 32 bytes
        address token1 = address(transaction.readBytes20(88)); // 20 bytes
        address token2 = address(transaction.readBytes20(108)); // 20 bytes
        address to = address(transaction.readBytes20(128)); // 20 bytes
        uint256 deadline = uint256(transaction.readBytes32(148)); // 32 bytes
        bytes32 mdHash = transaction.readBytes32(180); // 32 bytes

        commitWV.push(mdHash);

        bool isExactTokensForTokens = (keccak256(
            abi.encodePacked(functionName)
        ) == keccak256(abi.encodePacked(bytes32("swapExactTokensForTokens"))));
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

    function complain(
        address flipperAddress,
        bytes memory signature,
        string memory V,
        string memory W
    ) external payable {
        string memory concatenatedWV = string.concat(W, V);
        bytes32 computedWV = keccak256(abi.encodePacked(concatenatedWV));
        bytes32 _commitWV = commitWV[0];
        commitWV.pop();
        require(_commitWV == computedWV, "W+V hash does not match");
        // Verify revealedB + V hash
        string memory concatenatedBV = string.concat(
            Strings.toString(nowRevealedB),
            V
        ); // Here, you might need to check the type of revealedB and ensure its value is 0 or 1.
        // Recover signer's address from signature and messageHash
        address signer = recover(concatenatedBV, signature);
        require(signer == flipperAddress, "Invalid signature");
    }

    function recover(
        string memory message,
        bytes memory signature
    ) internal pure returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 r;
        bytes32 s;
        uint8 v;

        // Check the signature length
        if (signature.length != 65) {
            return address(0);
        }

        // Divide the signature into r, s, and v variables
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
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
}
