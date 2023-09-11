import { ethers } from "hardhat"
import * as fs from "fs"
import { Contract } from "ethers"

const userPrivateKey = process.env.PRIVATE_KEY
if (!userPrivateKey) {
    console.error("Private key not found in .env file")
    process.exit(1)
}

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)

const userWallet = new ethers.Wallet(userPrivateKey, provider) // 这里初始化
const IUniswapV2Router02_ADDRESS = "0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98"
const IUniswapV2Router02_ABI = JSON.parse(
    fs.readFileSync("./abis/router.json").toString(),
)
const IUniswapV2Router02 = new Contract(
    IUniswapV2Router02_ADDRESS,
    IUniswapV2Router02_ABI,
    userWallet,
) // 这里初始化

async function approveForSwap(
    tokenAddress: string,
    amount: BigInt,
    tokenABI: any,
) {
    const TokenContract = new ethers.Contract(
        tokenAddress,
        tokenABI,
        userWallet,
    )
    const approvalTx = await TokenContract.approve(
        IUniswapV2Router02_ADDRESS,
        amount,
    )
    await approvalTx.wait()
}

export async function BUY(
    token1: string,
    token2: string,
    token2ABI: any,
    amountOut: BigInt,
    amountInMax: BigInt,
    path: string[],
    gasLimit: number,
) {
    await approveForSwap(token1, amountInMax, token2ABI)
    // Calculate the minimum amount of tokens to accept (taking into account slippage)

    // Generate a 10-minute deadline from the current time
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10

    // Call swapExactTokensForTokens
    const tx = await IUniswapV2Router02.swapTokensForExactTokens(
        amountOut,
        amountInMax,
        path,
        userWallet.address,
        deadline,
        {
            gasLimit: gasLimit,
        },
    )

    return tx
}

export async function SELL(
    token1: string,
    token1ABI: any,
    token2: string,
    amountIn: BigInt,
    amountOutMin: BigInt, // 最少期望得到的WETH数量
    path: string[],
    gasLimit: number,
) {
    await approveForSwap(token1, amountIn, token1ABI)
    // Calculate the maximum amount of tokens to accept (taking into account slippage)

    // Generate a 10-minute deadline from the current time
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10

    // Call swapTokensForExactTokens
    const tx = await IUniswapV2Router02.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        userWallet.address,
        deadline,
        {
            gasLimit: gasLimit,
        },
    )

    return tx
}
