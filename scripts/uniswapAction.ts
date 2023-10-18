import { Contract, Interface, ethers } from "ethers"
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json"
const IUniswapV2Router02ABI = new Interface(IUniswapV2Router02.abi)
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
// 将数字转换为32字节的十六进制字符串
function toUint256(value: bigint): string {
    // 转换为16进制，移除'0x'，并确保结果是64字符长度
    return value.toString(16).padStart(64, "0")
}

// 将地址转换为20字节的十六进制字符串
function toAddress(address: string): string {
    // 移除'0x'并确保结果是40字符长度
    return address.slice(2).padStart(40, "0")
}

// 将常规字符串转换为24字节的十六进制字符串
function toBytes24(str: string): string {
    // 我们将字符串转换为Buffer，然后转换为Hex，确保它的长度为48字符（24字节）
    let buffer = Buffer.from(str, "utf-8")
    return "0x" + buffer.toString("hex").padEnd(48, "0")
}

// 将deadline从number转换为32字节的十六进制字符串
function toUint256FromNumber(value: number): string {
    return toUint256(BigInt(value))
}
export function buildBuyTx(
    amountOut: bigint,
    amountInMax: bigint,
    tokenA: string,
    tokenB: string,
    to: string,
    deadline: number,
    hashedWV: string,
): string {
    let functionName = toBytes24("swapTokensForExactTokens")
    let tx =
        functionName +
        toUint256(amountOut) +
        toUint256(amountInMax) +
        toAddress(tokenA) +
        toAddress(tokenB) +
        toAddress(to) +
        toUint256FromNumber(deadline) +
        hashedWV.slice(2) // 假设hashedWV是一个32字节的字符串

    return tx
}

export function buildSellTx(
    amountIn: bigint,
    amountOutMin: bigint,
    tokenA: string,
    tokenB: string,
    to: string,
    deadline: number,
    hashedWV: string,
): string {
    let functionName = toBytes24("swapExactTokensForTokens")
    let tx =
        functionName +
        toUint256(amountIn) +
        toUint256(amountOutMin) +
        toAddress(tokenA) +
        toAddress(tokenB) +
        toAddress(to) +
        toUint256FromNumber(deadline) +
        hashedWV.slice(2) // 假设hashedWV是一个32字节的字符串

    return tx
}
