import { ethers } from "hardhat"
import * as fs from "fs"
import * as path from "path"
import { readFileSync } from "fs"
// import * as secrets from "secrets.js-grempe"
import { MerkleTree } from "merkletreejs"
import { keccak256 } from "js-sha3"
import { buildBuyTx, buildSellTx } from "./uniswapAction"
import { signedMessage, verifySignature } from "./signatureUtils"
import { concatenateNumbers } from "./concatenateUtils"
import { randomBit } from "./randomUtils"
import { additiveSecretSharing } from "./additiveSecretSharing"
import { stringToHex } from "./utils"
import { ec } from "elliptic"
import * as EthCrypto from "eth-crypto"
import sss from "shamirs-secret-sharing"
import { toUtf8Bytes } from "ethers"

const curve = new ec("secp256k1")
async function main() {
    // Initialization 初始化
    const stakerWallets: any[] = []
    const N = 2 // N is the number of stakers
    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)

    const flipperPrivateKey = process.env[`PRIVATE_KEY_${0}`]
    if (!flipperPrivateKey) {
        console.error(`Private key for staker ${0} not found in .env file`)
        return
    }

    // User Wallet
    const userPrivateKey = process.env.PRIVATE_KEY
    if (!userPrivateKey) {
        console.error("Private key not found in .env file")
        return
    }
    // 0 is the flipper
    // 1, 2, 3, ... are the stakers
    // 这个本来不是整个系统的一部分，但是一开始staker和flipper都没钱，所以有了这一步让转点钱给
    for (let i = 0; i <= N; i++) {
        //     // N is the number of stakers
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
        //     const amountToSend = ethers.parseEther("0.01") // 0.01 ETH in wei
        //     const tx = await userWallet.sendTransaction({
        //         to: wallet.address,
        //         value: amountToSend,
        //     })
        //     await tx.wait() // Wait for the transaction to be mined
        //     let balance = await provider.getBalance(wallet.address)
        //     console.log(
        //         `Staker ${i} balance: ${parseFloat(
        //             ethers.formatEther(balance),
        //         ).toFixed(8)}`,
        //     )
    }

    await runSystem(
        userPrivateKey,
        stakerWallets,
        N,
        provider,
        flipperPrivateKey,
    )
}

async function runSystem(
    userPrivateKey: string,
    stakerWallets: any[],
    N: number,
    provider: any,
    flipperPrivateKey: any,
) {
    const userWallet = new ethers.Wallet(userPrivateKey, provider)
    const flipperWallet = new ethers.Wallet(flipperPrivateKey, provider)

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
    const animaguSwapContractWithUserWallet = new ethers.Contract(
        ANIMAGUSWAP_ADDRESS,
        ANIMAGUSWAP_ABI,
        userWallet,
    )
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

    // Stage 1: transaction creation
    const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
    const UNI_ABI = JSON.parse(fs.readFileSync("./abis/erc20.json").toString())
    // const UNI_CONTRACT = new ethers.Contract(UNI_ADDRESS, UNI_ABI, userWallet)

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
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10

    buyTx = await buildBuyTx(
        amountOut,
        amountInMax,
        buyPath,
        userWallet,
        deadline,
    )

    const amountIn = ethers.parseUnits("10", 18) // 例如：希望出售10个UNI
    const amountOutMin = ethers.parseUnits("0.01", 18) // 例如：至少希望得到0.01个WETH
    const sellPath = [UNI_ADDRESS, WETH_SEPOLIA_ADDRESS]

    sellTx = await buildSellTx(
        amountIn,
        amountOutMin,
        sellPath,
        userWallet,
        deadline,
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
    const commitment = ethers.keccak256(
        ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(txb))),
    )

    // Stage2: transaction submission
    const V = randomBit()
    const message = concatenateNumbers(B, V)

    console.log("message:", message)
    const keyPair = curve.keyFromPrivate(flipperPrivateKey.slice(2), "hex") //需要删掉0x
    const publicKeyHex = keyPair.getPublic("hex").slice(2) // 删除"04"前缀，因为eth-crypto期望一个没有前缀的公钥
    console.log("Public Key:", publicKeyHex)

    // 公钥私钥传输
    // 使用公钥加密消息
    const encryptedMessage = await EthCrypto.encryptWithPublicKey(
        publicKeyHex,
        message,
    )
    console.log("Encrypted message:", encryptedMessage)

    // 使用私钥解密消息
    const decryptedMessage = await EthCrypto.decryptWithPrivateKey(
        flipperPrivateKey,
        encryptedMessage,
    )
    console.log("Decrypted message:", decryptedMessage)

    // Flipper Sign it
    const signedCommitment = await signedMessage(
        flipperWallet,
        decryptedMessage,
    )
    console.log("signedCommitment:", signedCommitment)
    const verifySignatureResult = await verifySignature(
        signedCommitment,
        decryptedMessage,
        flipperWallet.address,
    )

    // Merkle Tree
    if (verifySignatureResult) {
        console.log("Signature verified!")
        // 分割 txb (assuming it's a string of the tx hash)
        // const shares = secrets.share(secrets.str2hex(txbAsString), N, N) // Splitting into N shares with N required to reconstruct
        // // 在每个share前加上“0x”

        // const secretBuffer = Buffer.from(txbAsString, "utf8")
        // const shares = sss.split(secretBuffer, {
        //     shares: N,
        //     threshold: N,
        // })
        const hexTxbAsString = stringToHex(txbAsString)
        console.log("hexTxbAsString", hexTxbAsString)
        const secretNumber = BigInt("0x" + hexTxbAsString) // 将秘密转换为bigint
        const FIELD_SIZE = BigInt(
            "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        ) // 例如：使用2^256-1作为有限域的大小

        const shares = additiveSecretSharing(secretNumber, N, FIELD_SIZE)
        // const shares = sharesBuffers.map((shareBuffer: string) =>
        //     shareBuffer.toString("hex"),
        // )
        console.log("shares:", shares)
        const prefixedShares = shares.map((share: string) => "0x" + share)

        // // 使用 prefixedShares 创建 Merkle 树
        const hashedShares = prefixedShares.map((share: string) =>
            ethers.keccak256(ethers.toUtf8Bytes(share)),
        )
        console.log("hashedShares:", hashedShares)
        const tree = new MerkleTree(shares, keccak256, { sort: true })
        const root = tree.getRoot().toString("hex")

        const hashedTree = new MerkleTree(hashedShares, keccak256, {
            sort: true,
        })
        const hashedRoot = hashedTree.getRoot().toString("hex")
        console.log("root:", root)
        console.log("hashedRoot:", hashedRoot)

        // 为每个 staker 创建一个数组，其中包含他们的 share 和其对应的 Merkle proof
        const stakerData = stakerWallets.map((staker, index) => {
            const proof = hashedTree.getHexProof(hashedShares[index])
            // console.log("hashedShares[index]:", hashedShares[index])
            // console.log("proof:", proof)
            return {
                stakerAddress: staker.address,
                share: shares[index],
                proof: proof,
            }
        })
        console.log(stakerData)
        // 签名每个'share'和'proof' user 签名，验证，以防User作恶
        const stakerDataWithSignatures = []
        for (const data of stakerData) {
            const shareSignature = await signedMessage(userWallet, data.share)
            const proofSignature = await signedMessage(
                userWallet,
                data.proof.join(""),
            )

            stakerDataWithSignatures.push({
                ...data,
                shareSignature: shareSignature,
                proofSignature: proofSignature,
            })
        }

        let areSignaturesValid = true
        for (const data of stakerDataWithSignatures) {
            const isShareSignatureValid = await verifySignature(
                data.shareSignature,
                data.share,
                userWallet.address,
            )
            const isProofSignatureValid = await verifySignature(
                data.proofSignature,
                data.proof.join(""),
                userWallet.address,
            )

            if (!isShareSignatureValid || !isProofSignatureValid) {
                areSignaturesValid = false
                break
            }
        }

        if (areSignaturesValid) {
            console.log("All signatures are valid!")
        } else {
            console.error("One or more signatures are invalid!")
        }
        // staker verify whether user cheats or not
        for (let index = 0; index < N; index++) {
            const hashedShare = ethers.keccak256(
                ethers.toUtf8Bytes("0x" + stakerData[index].share),
            )
            const isValidProof = tree.verify(
                stakerData[index].proof, // proof for the encryptedShare
                hashedShare, // the encryptedShare itself
                hashedRoot, // the root of the Merkle Tree
            )

            console.log(
                `Proof for staker ${index} is`,
                isValidProof ? "valid" : "invalid",
            )
        }

        // stage 3: transaction inclusion
        // 计算 (B|V) 和 Merkle root 的哈希
        const W = randomBit()
        console.log("W+V:", concatenateNumbers(W, V))
        const hashedWV = ethers.keccak256(
            ethers.toUtf8Bytes(concatenateNumbers(W, V).toString()),
        )
        // const hashedMerkleRoot = ethers.keccak256(
        //     ethers.toUtf8Bytes(hashedRoot),
        // )
        console.log("hashedRoot:", hashedRoot)
        console.log("hashedWV:", hashedWV)
        // console.log("hashedMerkleRoot:", hashedRoot)
        // 调用commit函数
        const commitTx = await animaguSwapContractWithUserWallet.commit(
            "0x" + hashedRoot,
            hashedWV,
            commitment,
        )
        await commitTx.wait()

        console.log("Commit transaction sent and mined.")
        const flipperContract = new ethers.Contract(
            ANIMAGUSWAP_ADDRESS,
            ANIMAGUSWAP_ABI,
            flipperWallet,
        )
        const balance = await provider.getBalance(flipperWallet.address)
        if (Number(balance) === 0) {
            console.error(
                "Flipper wallet has no ether. You need to fund it first.",
            )
            return
        }

        const flipperRevealedListener = (flipper: any, success: any) => {
            console.log(
                `Flipper ${flipper} reveal ${
                    success ? "successful" : "failed"
                }`,
            )
            // Remove the listener once it has fired to prevent it from being called multiple times.
            flipperContract.off("FlipperRevealed", flipperRevealedListener)
        }
        flipperContract.on("FlipperRevealed", flipperRevealedListener)

        let flipperB = decryptedMessage[0]
        try {
            const flipperRevealTx = await flipperContract.revealFlipper(
                flipperB,
            )
            await flipperRevealTx.wait()
        } catch (error) {
            console.error("Error when trying to reveal flipper:", error)
        }

        const stakerContractInstance = new ethers.Contract(
            ANIMAGUSWAP_ADDRESS,
            ANIMAGUSWAP_ABI,
            provider, // 使用全局provider
        )
        stakerContractInstance.on("StakerRevealed", (staker, success) => {
            console.log(
                `Staker ${staker} reveal ${success ? "successful" : "failed"}`,
            )
        })
        for (let index = 0; index < N; index++) {
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
            const stakerRevealTx = await stakerContract.revealStaker(
                "0x" + stakerData[index].share,
                stakerData[index].proof,
                N,
            )
            await stakerRevealTx.wait()
        }
        stakerContractInstance.removeAllListeners("StakerRevealed")
    } else {
        console.log("Signature verification failed!")
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
