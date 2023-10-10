import { Contract, Interface, ethers } from "ethers"
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json"

const IUniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
const IUniswapV2Router02ABI = new Interface(IUniswapV2Router02.abi)
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

export function buildBuyTx(
    amountOut: number,
    amountInMax: number,
    tokenA: string,
    tokenB: string,
    to: string,
    deadline: number,
): ethers.TransactionRequest {
    let path: string[]
    if (tokenA == WETH || tokenB == WETH) {
        path = [tokenA, tokenB]
    } else {
        path = [tokenA, WETH, tokenB]
    }

    return {
        to: IUniswapV2Router02Address,
        data: IUniswapV2Router02ABI.encodeFunctionData(
            "swapTokensForExactTokens",
            [amountOut, amountInMax, path, to, deadline],
        ),
    }
}

export function buildSellTx(
    amountIn: number,
    amountOutMin: number,
    tokenA: string,
    tokenB: string,
    to: string,
    deadline: number,
): ethers.TransactionRequest {
    let path: string[]
    if (tokenA == WETH || tokenB == WETH) {
        path = [tokenB, tokenA]
    } else {
        path = [tokenB, WETH, tokenA]
    }
    return {
        to: IUniswapV2Router02Address,
        data: IUniswapV2Router02ABI.encodeFunctionData(
            "swapExactTokensForTokens",
            [amountIn, amountOutMin, path, to, deadline],
        ),
    }
}
// 编码 TransactionRequest 为十六进制
export function encodeTransactionToHex(tx: ethers.TransactionRequest): string {
    return tx.to?.toString()! + tx.data?.toString()!.slice(2)
}

// 从十六进制解码到 TransactionRequest
export function decodeHexToTransaction(
    hexString: string,
): ethers.TransactionRequest {
    let to = "0x" + hexString.substring(2, 42) // 地址长度为 42 个字符 (包括 "0x" 前缀)
    let data = "0x" + hexString.substring(42)

    // 从十六进制字符串创建 TransactionRequest 对象
    let tx: ethers.TransactionRequest = {
        to: to,
        data: data,
    }

    return tx
}

// 使用 Uniswap 的 ABI 来解码 data
export function decodeData(tx: ethers.TransactionRequest) {
    if (!tx.data) {
        throw new Error("Transaction data is missing")
    }
    const _decodedData = IUniswapV2Router02ABI.parseTransaction({
        data: tx.data.toString(),
    })
    console.log("decodedData:", _decodedData)

    return {
        functionName: _decodedData!.name,
        parameters: _decodedData!.args.toArray(),
    }
}
