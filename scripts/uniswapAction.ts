import { Contract, Interface, ethers } from "ethers"
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json"
const IUniswapV2Router02ABI = new Interface(IUniswapV2Router02.abi)
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

export function buildBuyTx(
    amountOut: bigint,
    amountInMax: bigint,
    tokenA: string,
    tokenB: string,
    to: string,
    deadline: number,
    hashedWV: string,
): string {
    let functionName = "swapTokensForExactTokens"

    return `${functionName},${amountOut},${amountInMax},${tokenA},${tokenB},${to},${deadline},${hashedWV}`
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
    let functionName = "swapExactTokensForTokens"

    // 不需要再为path进行逻辑判断，因为我们只是返回拼接的字符串

    return `${functionName},${amountIn},${amountOutMin},${tokenA},${tokenB},${to},${deadline},${hashedWV}`
}
