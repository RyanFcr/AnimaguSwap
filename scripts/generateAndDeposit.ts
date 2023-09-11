import { ethers } from "hardhat"
import * as fs from "fs"
import * as path from "path"
import { Contract } from "ethers"
import { readFileSync } from "fs"

function randomBit(): number {
    // Create a Uint8Array with a length of 1
    let arr = new Uint8Array(1)
    // Populate the array with random values
    crypto.getRandomValues(arr)
    // Return the least significant bit of the first element (i.e., 0 or 1)
    return arr[0] & 1
}

async function main() {
    const stakerWallets: any[] = []
    const N = 2

    const userPrivateKey = process.env.PRIVATE_KEY

    if (!userPrivateKey) {
        console.error("Private key not found in .env file")
        return
    }

    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
    const Goerli_RPC_URL = process.env.GOERLI_RPC_URL || ""
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)

    const userWallet = new ethers.Wallet(userPrivateKey, provider)

    for (let i = 1; i <= N; i++) {
        // N is the number of stakers
        const privateKey = process.env[`PRIVATE_KEY_${i}`]

        if (!privateKey) {
            console.error(`Private key for staker ${i} not found in .env file`)
            continue
        }
        const wallet = new ethers.Wallet(privateKey, provider)
        stakerWallets.push({
            address: wallet.address,
            privateKey: wallet.privateKey,
        })
        const amountToSend = ethers.parseEther("0.01") // 0.01 ETH in wei
        const tx = await userWallet.sendTransaction({
            to: wallet.address,
            value: amountToSend,
        })
        await tx.wait() // Wait for the transaction to be mined
        let balance = await provider.getBalance(wallet.address)
        console.log(
            `Staker ${i} balance: ${parseFloat(
                ethers.formatEther(balance),
            ).toFixed(8)}`,
        )
    }
    // console.log("userWallet:\n")
    // console.log(userWallet)
    // console.log("stakerWallets:\n")
    // console.log(stakerWallets)

    //DAI：USDT = 1:1
    //BUY(Y, X, Δr_Y, Δr_X, s, md)=SwapTokensforExactTokens
    //SELL(X, Y, Δr_X, Δr_Y, s, md)=SwapExactTokensForTokens

    //Uniswap-V2 router on sepolia: 0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98
    //Uniswap-V2 router on goerli: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

    // Define Uniswap V2 router contract
    const IUniswapV2Router02_ADDRESS =
        "0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98"
    const IUniswapV2Router02_ABI = JSON.parse(
        fs.readFileSync("./abis/router.json").toString(),
    )
    const IUniswapV2Router02 = new Contract(
        IUniswapV2Router02_ADDRESS,
        IUniswapV2Router02_ABI,
        userWallet,
    )
    //Sepolia DAI 0x64cE2F75c6887C77c61991bA2D6e456f9698adc3
    //Goerli DAI 0x5c221e77624690fff6dd741493d735a17716c26b
    // Uni 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
    // const Uni: Token = new Token(
    //     ExtendedChainId.SEPOLIA as any,
    //     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    //     18,
    // )

    const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
    const UNI_ABI = JSON.parse(fs.readFileSync("./abis/erc20.json").toString())
    const UNI_CONTRACT = new ethers.Contract(UNI_ADDRESS, UNI_ABI, userWallet)

    const WETH_SEPOLIA_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"

    const random = randomBit()
    const B = randomBit()

    console.log("Random number:", random)
    console.log("B:", B)
    let balance = await provider.getBalance(userWallet.address)
    console.log(
        `User wallet balance:${parseFloat(ethers.formatEther(balance)).toFixed(
            8,
        )}`,
    )

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

    async function BUY(
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

    async function SELL(
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

    let buyTx
    let sellTx
    let tx
    let txh

    const amountOut = ethers.parseUnits("10", 18) // 例如：希望得到10个UNI
    const amountInMax = ethers.parseUnits("0.1", 18) // 例如：最多愿意支付0.1个WETH
    const buyPath = [WETH_SEPOLIA_ADDRESS, UNI_ADDRESS]
    const buyGasLimit = 300000

    buyTx = await BUY(
        WETH_SEPOLIA_ADDRESS,
        UNI_ADDRESS,
        UNI_ABI,
        amountOut,
        amountInMax,
        buyPath,
        buyGasLimit,
    )

    const amountIn = ethers.parseUnits("10", 18) // 例如：希望出售10个UNI
    const amountOutMin = ethers.parseUnits("0.01", 18) // 例如：至少希望得到0.01个WETH
    const sellPath = [UNI_ADDRESS, WETH_SEPOLIA_ADDRESS]
    const sellGasLimit = 300000

    sellTx = await SELL(
        UNI_ADDRESS,
        UNI_ABI,
        WETH_SEPOLIA_ADDRESS,
        amountIn,
        amountOutMin,
        sellPath,
        sellGasLimit,
    )

    if (random == 0) tx = buyTx
    else tx = sellTx

    if (B == 0) txh = tx
    else if (random == 0) txh = sellTx
    else txh = buyTx

    // console.log(tx)
    // console.log(txh)

    const contractArtifactPath = path.join(
        __dirname,
        "../artifacts/contracts/AnimaguSwap.sol/AnimaguSwap.json",
    )
    const contractArtifact = JSON.parse(
        readFileSync(contractArtifactPath, "utf8"),
    )
    const ANIMAGUSWAP_ABI = contractArtifact.abi
    const ANIMAGUSWAP_ADDRESS = fs
        .readFileSync("./output/AnimaguSwapAddress.txt")
        .toString() // 你应该从deploy脚本中动态获取这个地址。
    const depositAmount = ethers.parseEther("0.01") // or the amount you want to deposit

    for (let i = 1; i <= N; i++) {
        const privateKey = process.env[`PRIVATE_KEY_${i}`]

        if (!privateKey) {
            console.error(`Private key for staker ${i} not found in .env file`)
            continue
        }

        const stakerWallet = new ethers.Wallet(privateKey, provider)
        const animaguSwapContract = new ethers.Contract(
            ANIMAGUSWAP_ADDRESS,
            ANIMAGUSWAP_ABI,
            stakerWallet,
        )

        let balanceBefore = await provider.getBalance(stakerWallet.address)
        console.log(
            `Staker ${i} balance: ${parseFloat(
                ethers.formatEther(balanceBefore),
            ).toFixed(8)}`,
        )
        const depositTx = await animaguSwapContract.deposit(depositAmount, {
            value: depositAmount,
        })
        await depositTx.wait()
        console.log(`Deposited for staker ${stakerWallet.address}`)
        let balanceAfter = await provider.getBalance(stakerWallet.address)
        console.log(
            `Staker ${i} balance: ${parseFloat(
                ethers.formatEther(balanceAfter),
            ).toFixed(8)}`,
        )
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
