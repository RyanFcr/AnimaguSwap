// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnimaguSwap {
    function deposit(uint256 _amount) external payable returns (bool);

    function commit(bytes32 _commitment) external returns (bool);

    function commitAndExecute(
        bytes32 newCommitment,
        string memory txbAsString
    ) external returns (bool);

    function revealStaker(
        string memory share,
        bytes32[] memory proof
    ) external payable returns (bool);

    function revealFlipper(uint8 _b) external payable returns (bool);

    function userComplain(
        address flipperWallet,
        bytes32 signature,
        uint8 V,
        uint8 W
    ) external payable returns (bool);

    function recoverAndExecute(
        string memory buyTx,
        string memory sellTx
    ) external payable;
}
