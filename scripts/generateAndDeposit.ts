import { ethers } from "hardhat"
import * as fs from "fs"
import { ChainId, Token, WETH } from "@uniswap/sdk"
import { Contract } from "ethers"

async function main() {
    const stakerWallets: any[] = []
    const N = 10

    const userPrivateKey = process.env.PRIVATE_KEY

    if (!userPrivateKey) {
        console.error("Private key not found in .env file")
        return
    }

    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const userWallet = new ethers.Wallet(userPrivateKey, provider)
    const SEPOLIA_CHAIN_ID = 11155111 as any
    const WETH_SEPOLIA_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"

    console.log("Address:", userWallet.address)

    for (let i = 0; i <= N; i++) {
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

        // const amountToSend = ethers.parseEther("0.01") // 0.01 ETH in wei
        // const tx = await userWallet.sendTransaction({
        //     to: wallet.address,
        //     value: amountToSend,
        // })
        // await tx.wait() // Wait for the transaction to be mined
    }

    // Send 0.01 ETH to the new wallet

    console.log("userWallet:\n")
    console.log(userWallet)
    console.log("stakerWallets:\n")
    console.log(stakerWallets)

    //DAI：USDT = 1:1
    //BUY(Y, X, Δr_Y, Δr_X, s, md)=SwapTokensforExactTokens
    //SELL(X, Y, Δr_X, Δr_Y, s, md)=SwapExactTokensForTokens

    //Uniswap-V2 router on sepolia: 0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98
    //Uniswap-V2 router on goerli: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

    // Define Uniswap V2 router contract
    const UNISWAP_ROUTER_ADDRESS = "0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98"
    const UNISWAP_ROUTER_ABI = JSON.parse(
        fs.readFileSync("./abis/router.json").toString(),
    )
    const routerContract = new Contract(
        UNISWAP_ROUTER_ADDRESS,
        UNISWAP_ROUTER_ABI,
        userWallet,
    )

    //Sepolia DAI 0x64cE2F75c6887C77c61991bA2D6e456f9698adc3
    //Goerli DAI 0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa
    const DAI: Token = new Token(
        SEPOLIA_CHAIN_ID,
        "0x64cE2F75c6887C77c61991bA2D6e456f9698adc3",
        18,
    )
    const DAI_ABI = JSON.parse(fs.readFileSync("./abis/erc20.json").toString())
    // Generate a random number
    // const random = Math.round(Math.random())

    const random = 0
    console.log("Random number:", random)

    let balance = await ethers.provider.getBalance(userWallet.address)
    console.log("User wallet balance:", ethers.formatEther(balance))

    if (random === 0) {
        // Use ETH to buy DAI

        const amountIn = ethers.parseUnits("0.01") // amount of ETH you want to send
        const amountOutMin = ethers.parseUnits("0", 14) // set minimum amount of DAI you want to receive, better to use a realistic value here
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now

        // Call swapExactETHForTokens
        const tx = await routerContract.swapExactETHForTokens(
            amountOutMin,
            [WETH_SEPOLIA_ADDRESS, DAI.address],
            userWallet.address,
            deadline,
            { value: amountIn },
        )

        console.log("Transaction hash:", tx.hash)
        await tx.wait()
        console.log("Swap done!")
    } else {
        // Use DAI to buy a specific amount of ETH

        const amountOutExact = ethers.parseUnits("0.001", 18) // specify exact amount of ETH you want to receive
        const amountInMax = ethers.parseUnits("10", 18) // specify maximum amount of DAI you're willing to pay
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now

        // First, we need to approve the router to spend our DAI
        const daiContract = new Contract(DAI.address, DAI_ABI, userWallet)
        await daiContract.approve(UNISWAP_ROUTER_ADDRESS, amountInMax)

        // Call swapTokensForExactETH
        const tx = await routerContract.swapTokensForExactETH(
            amountOutExact,
            amountInMax,
            [DAI.address, WETH_SEPOLIA_ADDRESS],
            userWallet.address,
            deadline,
        )

        console.log("Transaction hash:", tx.hash)
        await tx.wait()
        console.log("Swap done!")
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
