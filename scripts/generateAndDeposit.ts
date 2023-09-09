import { ethers } from "hardhat"
import * as fs from "fs"
import { Contract } from "ethers"

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
    // const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const userWallet = new ethers.Wallet(userPrivateKey, provider)

    // console.log("Address:", userWallet.address)

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

        // const amountToSend = ethers.parseEther("0.01") // 0.01 ETH in wei
        // const tx = await userWallet.sendTransaction({
        //     to: wallet.address,
        //     value: amountToSend,
        // })
        // await tx.wait() // Wait for the transaction to be mined
        // let balance = await provider.getBalance(wallet.address)
        // console.log(
        //     `Staker ${i} balance: ${parseFloat(
        //         ethers.formatEther(balance),
        //     ).toFixed(8)}`,
        // )
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
    // const IUniswapV2Factory_ADDRESS =
    //     "0xc9f18c25Cfca2975d6eD18Fc63962EBd1083e978"
    // const IUniswapV2Factory_ABI = JSON.parse(
    //     fs.readFileSync("./abis/IUniswapV2Factory.json").toString(),
    // )
    // const IUniswapV2Factory = new Contract(
    //     IUniswapV2Factory_ADDRESS,
    //     IUniswapV2Factory_ABI,
    //     userWallet,
    // )

    // const IUniswapV2Pair_ADDRESS = "0xc9f18c25Cfca2975d6eD18Fc63962EBd1083e978"
    // const IUniswapV2Pair_ABI = JSON.parse(
    //     fs.readFileSync("./abis/IUniswapV2Pair.json").toString(),
    // )
    // const IUniswapV2Pair = new Contract(
    //     IUniswapV2Pair_ADDRESS,
    //     IUniswapV2Pair_ABI,
    //     userWallet,
    // )

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
    // Generate a random number
    // const pairAddress = await IUniswapV2Factory.getPair(
    //     WETH_SEPOLIA_ADDRESS,
    //     UNI_ADDRESS,
    // )
    // console.log("ETH-UNI pair address:", pairAddress)

    const random = Math.round(Math.random())

    // const random = 1
    console.log("Random number:", random)

    let balance = await provider.getBalance(userWallet.address)
    console.log(
        `User wallet balance:${parseFloat(ethers.formatEther(balance)).toFixed(
            8,
        )}`,
    )

    if (random == 0) {
        // Use ETH to buy DAI
        // const WETH_EXTENDED: { [chainId in ExtendedChainId]: Token } = {
        //     ...WETH,
        //     [ExtendedChainId.SEPOLIA]: new Token(
        //         ExtendedChainId.SEPOLIA as any,
        //         WETH_SEPOLIA_ADDRESS,
        //         18,
        //     ),
        // }
        const amountIn = ethers.parseUnits("0.01") // amount of ETH you want to send
        const amountOutMin = ethers.parseUnits("0.005") // set minimum amount of DAI you want to receive, better to use a realistic value here
        const path = [WETH_SEPOLIA_ADDRESS, UNI_ADDRESS]
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10 minutes from now
        // // Call swapExactETHForTokens
        const tx = await IUniswapV2Router02.swapExactETHForTokens(
            amountOutMin,
            path,
            userWallet.address,
            deadline,
            {
                value: amountIn,
                gasLimit: 300000,
            },
        )
        console.log("Transaction hash:", tx.hash)
        const receipt = await tx.wait()
        console.log("Transaction was mined in block:", receipt.blockNumber)
    } else {
        // Use Uni to buy ETH
        const amountIn = ethers.parseUnits("10", 18) // amount of UNI you want to sell, e.g., 10 UNI
        const amountOutMin = ethers.parseUnits("0.005", 18) // set minimum amount of ETH you want to receive
        const path = [UNI_ADDRESS, WETH_SEPOLIA_ADDRESS]
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10 minutes from now

        // Approve the Uniswap Router to spend your UNI tokens.
        const approvalTx = await UNI_CONTRACT.approve(
            IUniswapV2Router02_ADDRESS,
            amountIn,
        )
        await approvalTx.wait()

        // Call swapExactTokensForETH
        const tx = await IUniswapV2Router02.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            userWallet.address,
            deadline,
            {
                gasLimit: 300000,
            },
        )
        console.log("Transaction hash:", tx.hash)
        const receipt = await tx.wait()
        console.log("Transaction was mined in block:", receipt.blockNumber)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
