import { ethers } from "hardhat"
import * as fs from "fs"
import * as path from "path"
import { readFileSync } from "fs"
// import * as secrets from "secrets.js-grempe"
import sss from "shamirs-secret-sharing"
import { MerkleTree } from "merkletreejs"
import { keccak256 } from "js-sha3"
import { buildBuyTx, buildSellTx } from "./uniswapAction"
import { signedMessage, verifySignature } from "./signatureUtils"
import { concatenateNumbers } from "./concatenateUtils"
import { randomBit } from "./randomUtils"
import { ec } from "elliptic"
import * as EthCrypto from "eth-crypto"

const curve = new ec("secp256k1")
async function main() {
    // Initialization
    const stakers: any[] = []
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
    const userWallet = new ethers.Wallet(userPrivateKey, provider)
    // 0 is the flipper
    // 1, 2, 3, ... are the stakers
    // 这个本来不是整个系统的一部分，但是一开始staker和flipper都没钱，所以有了这一步让转点钱给
    for (let i = 0; i <= N; i++) {
        const privateKey = process.env[`PRIVATE_KEY_${i}`]

        if (!privateKey) {
            console.error(`Private key for staker ${i} not found in .env file`)
            continue
        }
        const wallet = new ethers.Wallet(privateKey, provider)
        // 0 is the flipper
        if (i > 0) {
            stakers.push({
                address: wallet.address,
                privateKey: wallet.privateKey,
            })
        }
        // const amountToSend = ethers.parseEther("0.1") // 0.01 ETH in wei
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

    await runSystem(userPrivateKey, stakers, N, provider, flipperPrivateKey)
}

async function runSystem(
    userPrivateKey: string,
    stakers: any[],
    N: number,
    provider: any,
    flipperPrivateKey: any,
) {
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
        .toString()

    // Wallet
    const userWallet = new ethers.Wallet(userPrivateKey, provider)
    const flipperWallet = new ethers.Wallet(flipperPrivateKey, provider)
    const stakerWallets: any[] = []

    // Contract
    const userContract = new ethers.Contract(
        ANIMAGUSWAP_ADDRESS,
        ANIMAGUSWAP_ABI,
        userWallet,
    )
    const flipperContract = new ethers.Contract(
        ANIMAGUSWAP_ADDRESS,
        ANIMAGUSWAP_ABI,
        flipperWallet,
    )
    const stakerContracts: any[] = []
    for (let index = 0; index < N; index++) {
        const privateKey = process.env[`PRIVATE_KEY_${index + 1}`]
        if (!privateKey) {
            console.error(
                `Private key for staker ${index + 1} not found in .env file`,
            )
            continue
        }

        if (!stakerWallets[index]) {
            stakerWallets[index] = new ethers.Wallet(privateKey, provider)
            stakerContracts[index] = new ethers.Contract(
                ANIMAGUSWAP_ADDRESS,
                ANIMAGUSWAP_ABI,
                stakerWallets[index],
            )
        }
    }
    for (let i = 0; i <= N; i++) {
        const depositAmount = ethers.parseEther("0.001") // or the amount you want to deposit
        let depositWallet, depositContract
        if (i == 0) {
            depositWallet = flipperWallet
            depositContract = flipperContract
        } else {
            depositWallet = stakerWallets[i - 1]
            depositContract = stakerContracts[i - 1]
        }

        let balanceBefore = await provider.getBalance(depositWallet.address)
        console.log(
            `Staker ${i} balance: ${parseFloat(
                ethers.formatEther(balanceBefore),
            ).toFixed(8)}`,
        )
        const depositTx = await depositContract.deposit(depositAmount, {
            value: depositAmount,
        })
        await depositTx.wait()
        console.log(`Deposited for staker ${depositWallet.address}`)
        let balanceAfter = await provider.getBalance(depositWallet.address)
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

    // Stage 1: transaction creation
    const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
    const WETH_SEPOLIA_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"

    const random = 0 //randomBit()
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

    const amountOut = ethers.parseUnits("10", 18) // For example: Wanting to get 10 UNI tokens
    const amountInMax = ethers.parseUnits("0.1", 18) // For example: Willing to pay a maximum of 0.1 WETH
    const buyPath = [WETH_SEPOLIA_ADDRESS, UNI_ADDRESS]
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10

    buyTx = await buildBuyTx(
        amountOut,
        amountInMax,
        buyPath,
        userWallet,
        deadline,
    )

    const amountIn = ethers.parseUnits("10", 18) // For example: Wanting to sell 10 UNI tokens
    const amountOutMin = ethers.parseUnits("0.01", 18) // For example: Expecting to receive at least 0.01 WETH
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

    const stringBuyTx = buyTx.to?.toString()! + buyTx.data?.toString()!.slice(2)
    const stringSellTx =
        sellTx.to?.toString()! + sellTx.to?.toString()!.slice(2)
    const txbAsString =
        txb.to?.toString().toLowerCase()! + txb.data?.toString()!.slice(2)
    const commitment = ethers.solidityPackedKeccak256(["string"], [txbAsString])
    console.log("txbAsString:", txbAsString)
    console.log("commitment:", commitment) //hex

    // Stage2: transaction submission
    // Call commit
    const commitTx = await userContract.commit(commitment)
    await commitTx.wait()
    console.log("Commit transaction sent and mined.")

    const V = randomBit()
    const message = concatenateNumbers(B, V) // Concatenation of B and V

    const keyPair = curve.keyFromPrivate(flipperPrivateKey.slice(2), "hex") // Remove the "0x" prefix
    const publicKeyHex = keyPair.getPublic("hex").slice(2) // Remove the "04" prefix because eth-crypto expects a public key without this prefix

    // Message encryption with the public key
    const encryptedMessage = await EthCrypto.encryptWithPublicKey(
        publicKeyHex,
        message,
    )

    // Decryption of the message with the private key
    const decryptedMessage = await EthCrypto.decryptWithPrivateKey(
        flipperPrivateKey,
        encryptedMessage,
    )

    // Flipper Sign it
    const signedCommitment = await signedMessage(
        flipperWallet,
        decryptedMessage,
    )
    const verifySignatureResult = await verifySignature(
        signedCommitment,
        decryptedMessage,
        flipperWallet.address,
    )

    // Merkle Tree
    if (verifySignatureResult) {
        console.log("Signature verified!")
        const secret = Buffer.from(txbAsString)
        console.log("secret:", secret)
        const shares = sss.split(secret, { shares: 2, threshold: 2 })
        console.log("shares:", shares)

        const tree = new MerkleTree(shares, keccak256, { sort: true })
        const root = "0x" + tree.getRoot().toString("hex")

        // Create an array for each staker, containing their share and its corresponding Merkle proof
        const stakerData = stakers.map((staker, index) => {
            const proof = tree.getHexProof(shares[index])
            return {
                stakerAddress: staker.address,
                share: shares[index],
                proof: proof,
            }
        })
        console.log(stakerData)
        // Sign each 'share' and 'proof' with user's signature and verify to prevent malicious behavior by the user
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
            const isValidProof = tree.verify(
                stakerData[index].proof, // proof for the encryptedShare
                stakerData[index].share, // the encryptedShare itself
                root, // the root of the Merkle Tree
            )
            console.log(
                `Proof for staker ${index} is`,
                isValidProof ? "valid" : "invalid",
            )
        }

        // Stage 3: Transaction Inclusion
        const recoveredTx = sss.combine(shares.slice(0, 2))
        const recoveredTxString = recoveredTx.toString()
        console.log("recovered:", recoveredTx)
        console.log("recovered:", recoveredTxString)
        const recoveredTxHash = ethers.solidityPackedKeccak256(
            ["string"],
            [recoveredTxString],
        )
        // Calculate the hash of (B|V) and the Merkle root
        const W = randomBit()
        console.log("W+V:", concatenateNumbers(W, V))
        const hashedWV = ethers.keccak256(
            ethers.toUtf8Bytes(concatenateNumbers(W, V).toString()),
        )

        let flipperB = decryptedMessage[0]
        try {
            const flipperRevealTx = await flipperContract.revealFlipper(
                flipperB,
            )
            await flipperRevealTx.wait()
        } catch (error) {
            console.error("Error when trying to reveal flipper:", error)
        }

        for (let index = 0; index < N; index++) {
            const stakerRevealTx = await stakerContracts[index].revealStaker(
                stakerData[index].share,
                stakerData[index].proof,
            )
            await stakerRevealTx.wait()
        }

        const secretRecoveredListener = (secret: string) => {
            console.log(`Secret recovered: ${secret}`)
            userContract.off("SecretRecovered", secretRecoveredListener)
        }
        const recoveredHashListener = (hash: string) => {
            console.log(`Hash recovered: ${hash}`)
            userContract.off("LogHash", recoveredHashListener)
        }
        const transactionExecutedListener = (
            to: string,
            data: string,
            success: boolean,
        ) => {
            console.log(
                `Transaction executed to: ${to}, data: ${data}, success: ${success}`,
            )
            userContract.off("TransactionExecuted", transactionExecutedListener)
        }

        userContract.on("TransactionExecuted", transactionExecutedListener)
        userContract.on("SecretRecovered", secretRecoveredListener)
        userContract.on("LogHash", recoveredHashListener)
        const recoverAndExecute = await userContract.recoverAndExecute(
            stringBuyTx,
            stringSellTx,
        )
        await recoverAndExecute.wait()

        //userComplain
    } else {
        console.log("Signature verification failed!")
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
