import { Contract, Interface, ethers } from "ethers"
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json"

const IUniswapV2Router02Address = "0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98"
const IUniswapV2Router02ABI = new Interface(IUniswapV2Router02.abi)

export function buildBuyTx(
    amountOut: bigint,
    amountInMax: bigint,
    path: string[],
    userWallet: any,
    deadline: number,
): ethers.TransactionRequest {
    return {
        to: IUniswapV2Router02Address,
        data: IUniswapV2Router02ABI.encodeFunctionData(
            "swapTokensForExactTokens",
            [amountOut, amountInMax, path, userWallet.address, deadline],
        ),
    }
}

export function buildSellTx(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    userWallet: any,
    deadline: number,
): ethers.TransactionRequest {
    return {
        to: IUniswapV2Router02Address,
        data: IUniswapV2Router02ABI.encodeFunctionData(
            "swapExactTokensForTokens",
            [amountIn, amountOutMin, path, userWallet.address, deadline],
        ),
    }
}

// 解析 recoveredTxString 得到 to 和 data
export function parseRecoveredTx(recoveredTxString: string): {
    to: string
    data: string
} {
    const to = recoveredTxString.slice(0, 42) // 假设 to 地址是前 42 个字符（包括 '0x'）
    const data = recoveredTxString.slice(42)
    return { to, data }
}

// 使用 Uniswap 的 ABI 来解码 data
export function decodeData(data: string): any {
    const decodedData = IUniswapV2Router02ABI.parseTransaction({ data: data })

    return {
        functionName: decodedData!.name,
        parameters: decodedData!.args,
    }
}
