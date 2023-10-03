import { Contract, Interface, ethers } from "ethers"
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json"

const IUniswapV2Router02Address = "0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98"
const IUniswapV2Router02ABI = new Interface(IUniswapV2Router02.abi)

export function buildBuyTx(
    amountOut: BigInt,
    amountInMax: BigInt,
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
    amountIn: BigInt,
    amountOutMin: BigInt,
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
