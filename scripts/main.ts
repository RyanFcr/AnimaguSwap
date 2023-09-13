import { ethers } from "hardhat"
import * as fs from "fs"
import * as path from "path"
import { readFileSync } from "fs"
import * as secrets from "secrets.js-grempe"
import { MerkleTree } from "merkletreejs"
import { keccak256 } from "js-sha3"
import { BUY, SELL } from "./uniswapAction"
import { signedMessage, verifySignature } from "./signatureUtils"
import { randomBit } from "./randomUtils"

async function main() {
    // stage1: generate wallets
    const stakerWallets: any[] = []
    const N = 2 // N is the number of stakers
    const userPrivateKey = process.env.PRIVATE_KEY

    if (!userPrivateKey) {
        console.error("Private key not found in .env file")
        return
    }

    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const userWallet = new ethers.Wallet(userPrivateKey, provider)

    const flipperPrivateKey = process.env[`PRIVATE_KEY_${0}`]
    if (!flipperPrivateKey) {
        console.error(`Private key for staker ${0} not found in .env file`)
        return
    }
    const flipperWallet = new ethers.Wallet(flipperPrivateKey, provider)
    // 0 is the flipper
    // 1, 2, 3, ... are the stakers
    for (let i = 0; i <= N; i++) {
        // N is the number of stakers
        const privateKey = process.env[`PRIVATE_KEY_${i}`]

        if (!privateKey) {
            console.error(`Private key for staker ${i} not found in .env file`)
            continue
        }
        const wallet = new ethers.Wallet(privateKey, provider)
        // 0 is the flipper
        if (i > 0) {
            stakerWallets.push({
                address: wallet.address,
                privateKey: wallet.privateKey,
            })
        }
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

    let buyTx
    let sellTx
    let tx
    let txb

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

    if (B == 0) txb = tx
    else if (random == 0) txb = sellTx
    else txb = buyTx

    // console.log(tx)
    // console.log(txb)

    const txbAsString = JSON.stringify(txb)
    console.log("txbAsString:", txbAsString)
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

    // stage1: deposit
    for (let i = 0; i <= N; i++) {
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
    // stage2: communicate
    const V = randomBit()
    const message = (V | B).toString()

    const signedMessageResult = await signedMessage(flipperWallet, message)
    const verifySignatureResult = await verifySignature(
        signedMessageResult,
        message,
        flipperWallet.address,
    )

    if (verifySignatureResult) {
        console.log("Signature verified!")
        // 分割 txb (assuming it's a string of the tx hash)
        const shares = secrets.share(secrets.str2hex(txbAsString), N, N) // Splitting into N shares with N required to reconstruct
        // const encryptedShares = shares.map((share) => ethers.keccak256(share))
        // 使用 shares 创建 Merkle 树
        const tree = new MerkleTree(shares, keccak256, { sort: true })
        const root = tree.getRoot().toString("hex")

        // 为每个 staker 创建一个数组，其中包含他们的 share 和其对应的 Merkle proof
        const stakerData = stakerWallets.map((staker, index) => {
            const proof = tree.getHexProof(shares[index])
            return {
                stakerAddress: staker.address,
                share: shares[index],
                proof: proof,
            }
        })
        console.log(stakerData)
        const animaguSwapContractWithUserWallet = new ethers.Contract(
            ANIMAGUSWAP_ADDRESS,
            ANIMAGUSWAP_ABI,
            userWallet,
        )

        // 计算 (B|V) 和 Merkle root 的哈希
        const hashedBV = ethers.keccak256(
            ethers.toUtf8Bytes((B | V).toString()),
        )
        const hashedMerkleRoot = ethers.keccak256(ethers.toUtf8Bytes(root))

        // 调用commit函数
        const commitTx = await animaguSwapContractWithUserWallet.commit(
            hashedBV,
            hashedMerkleRoot,
        )
        await commitTx.wait()

        console.log("Commit transaction sent and mined.")
        for (let index = 0; index < N; index++) {
            const isValidProof = tree.verify(
                stakerData[index].proof, // proof for the encryptedShare
                stakerData[index].share, // the encryptedShare itself
                root, // the root of the Merkle Tree
            )

            console.log(
                `Proof for staker ${index} is`,
                isValidProof ? "valid" : "invalid",
            )
            // user didn't cheat
            if (isValidProof) {
                const privateKey = process.env[`PRIVATE_KEY_${index + 1}`]
                if (!privateKey) {
                    console.error(
                        `Private key for staker ${
                            index + 1
                        } not found in .env file`,
                    )
                    continue
                }
                const stakerWallet = new ethers.Wallet(privateKey, provider)
                const stakerContract = new ethers.Contract(
                    ANIMAGUSWAP_ADDRESS,
                    ANIMAGUSWAP_ABI,
                    stakerWallet,
                )
                let shareBytes32 = ethers.encodeBytes32String(
                    stakerData[index].share,
                )
                let proofBytes32 = stakerData[index].proof.map((proof) =>
                    ethers.encodeBytes32String(proof),
                )
                // Assuming the revealStaker function accepts the hashed root as its only argument
                const stakerRevealTx = await stakerContract.revealStaker(
                    shareBytes32,
                    proofBytes32,
                )
                await stakerRevealTx.wait()
            }
        }
        const flipperContract = new ethers.Contract(
            ANIMAGUSWAP_ADDRESS,
            ANIMAGUSWAP_ABI,
            flipperWallet,
        )
        const flipperHashedBV = ethers.keccak256(ethers.toUtf8Bytes(message))

        const flipperRevealTx = await flipperContract.revealFlipper(
            flipperHashedBV,
        )
        await flipperRevealTx.wait()
        console.log("Flipper revealed with B|V hash:", hashedBV)
    } else {
        console.log("Signature verification failed!")
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
