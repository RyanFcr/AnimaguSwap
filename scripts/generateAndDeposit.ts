import { ethers } from "hardhat"
import * as fs from "fs"
import {
    ChainId,
    Fetcher,
    Percent,
    Route,
    Token,
    TokenAmount,
    Trade,
    TradeType,
    WETH,
} from "@uniswap/sdk"
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
    const provider = new ethers.JsonRpcProvider(Goerli_RPC_URL)
    const userWallet = new ethers.Wallet(userPrivateKey, provider)

    enum ExtendedChainId {
        SEPOLIA = 11155111,
        MAINNET = ChainId.MAINNET,
        ROPSTEN = ChainId.ROPSTEN,
        RINKEBY = ChainId.RINKEBY,
        GÖRLI = ChainId.GÖRLI,
        KOVAN = ChainId.KOVAN,
    }

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
    const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    const UNISWAP_ROUTER_ABI = JSON.parse(
        fs.readFileSync("./abis/router.json").toString(),
    )
    const routerContract = new Contract(
        UNISWAP_ROUTER_ADDRESS,
        UNISWAP_ROUTER_ABI,
        userWallet,
    )

    //Sepolia DAI 0x64cE2F75c6887C77c61991bA2D6e456f9698adc3
    //Goerli DAI 0x5c221e77624690fff6dd741493d735a17716c26b
    const DAI: Token = new Token(
        ChainId.GÖRLI,
        "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
        18,
    )
    // const DAI_ABI = JSON.parse(fs.readFileSync("./abis/erc20.json").toString())
    // Generate a random number
    // const random = Math.round(Math.random())

    const random = 0
    console.log("Random number:", random)

    let balance = await provider.getBalance(userWallet.address)
    console.log(
        `User wallet balance:${parseFloat(ethers.formatEther(balance)).toFixed(
            8,
        )}`,
    )

    async function swapTokens(
        token1: Token,
        token2: Token,
        amount: string,
        slippage: string = "50",
    ) {
        try {
            const pair = await Fetcher.fetchPairData(token1, token2)
            const route = new Route([pair], token2)

            const amountIn = BigInt(ethers.parseEther(amount).toString()) // Convert to BigInt

            const slippageTolerance = new Percent(slippage, "1000000")

            const trade = new Trade(
                route,
                new TokenAmount(token2, amountIn.toString()),
                TradeType.EXACT_INPUT,
            )

            const amountOutMin = BigInt(
                trade.minimumAmountOut(slippageTolerance).raw.toString(),
            )

            const path = [token2.address, token1.address]
            const to = userWallet.address

            const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20)

            const value = BigInt(trade.inputAmount.raw.toString())

            const rawTxn = await routerContract.swapExactETHForTokens(
                amountOutMin.toString(),
                path,
                to,
                deadline.toString(),
                {
                    value: value.toString(), // Converted BigInt to string
                },
            )

            const sendTxn = await userWallet.sendTransaction(rawTxn)
            const receipt = await sendTxn.wait()

            if (receipt) {
                console.log(
                    " - Transaction is mined - ",
                    "Transaction Hash:",
                    sendTxn.hash,
                    "Block Number:",
                    receipt.blockNumber,
                    "Navigate to https://sepolia.etherscan.io/txn/" +
                        sendTxn.hash,
                    "to see your transaction",
                )
            } else {
                console.log("Error submitting transaction")
            }
        } catch (e) {
            console.log(e)
        }
    }
    if (random === 0) {
        // Use ETH to buy DAI
        // const WETH_SEPOLIA_ADDRESS =
        //     "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"

        // const WETH_EXTENDED: { [chainId in ExtendedChainId]: Token } = {
        //     ...WETH,
        //     [ExtendedChainId.SEPOLIA]: new Token(
        //         ExtendedChainId.SEPOLIA as any,
        //         WETH_SEPOLIA_ADDRESS,
        //         18,
        //     ),
        // }

        swapTokens(WETH[ChainId.GÖRLI], DAI, "0.001")
        // const amountIn = ethers.parseUnits("0.01") // amount of ETH you want to send
        // const amountOutMin = ethers.parseUnits("0.005") // set minimum amount of DAI you want to receive, better to use a realistic value here
        // const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10 minutes from now

        // // Call swapExactETHForTokens
        // const tx = await routerContract.swapExactETHForTokens(
        //     amountOutMin,
        //     [WETH_SEPOLIA_ADDRESS, DAI.address],
        //     userWallet.address,
        //     deadline,
        //     { value: amountIn },
        // )
    } else {
        // Use DAI to buy a specific amount of ETH
        // const amountOutExact = ethers.parseUnits("0.001", 18) // specify exact amount of ETH you want to receive
        // const amountInMax = ethers.parseUnits("12", 18) // specify maximum amount of DAI you're willing to pay
        // const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now
        // // First, we need to approve the router to spend our DAI
        // const daiContract = new Contract(DAI.address, DAI_ABI, userWallet)
        // await daiContract.approve(UNISWAP_ROUTER_ADDRESS, amountInMax)
        // // Call swapTokensForExactETH
        // const tx = await routerContract.swapTokensForExactETH(
        //     amountOutExact,
        //     amountInMax,
        //     [DAI.address, WETH_SEPOLIA_ADDRESS],
        //     userWallet.address,
        //     deadline,
        // )
        // console.log("Transaction hash:", tx.hash)
        // await tx.wait()
        // console.log("Swap done!")
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
