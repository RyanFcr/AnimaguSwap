// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnimaguSwap {
    function deposit(uint256 _amount) external payable returns (bool);

    function commit(bytes32 _hashTx, bytes32 _hashWV) external returns (bool);

    function revealStaker(
        bytes32 share,
        bytes32[] memory proof
    ) external payable returns (bool);

    function revealFlipper(bytes32 _b) external payable returns (bool);
}
