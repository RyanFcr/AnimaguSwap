// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnimaguSwap {
    function deposit(uint256 _amount) external payable returns (bool);

    function commit(bytes32 _hash) external returns (bool);

    function revealStaker(bytes[] calldata _txs) external returns (bool);

    function revealFlipper(bytes32 _b) external returns (bool);

    function slash(address maliciousAddress) external payable returns (bool);

    function withdraw() external payable returns (bool);
}