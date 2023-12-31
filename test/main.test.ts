import { expect } from "chai"
import { ethers, network } from "hardhat"
import { IERC20, AnimaguSwap, AnimaguSwap__factory } from "../typechain-types"
import { randomBit } from "../scripts/randomUtils"
import { concatenateNumbers } from "../scripts/concatenateUtils"
import { buildBuyTx, buildSellTx } from "../scripts/uniswapAction"
import sss from "shamirs-secret-sharing"
import { MerkleTree } from "merkletreejs"
import { keccak256 } from "js-sha3"
import { signedMessage, verifySignature } from "../scripts/signatureUtils"
import { ec } from "elliptic"
import * as EthCrypto from "eth-crypto"
const curve = new ec("secp256k1")
describe("AnimaguSwap", function () {
    let AnimaguSwap: AnimaguSwap__factory
    let animaguSwap: AnimaguSwap
    let tokenIn: IERC20
    let tokenOut: IERC20
    const AMOUNT_IN: bigint = 100000000n
    // const AMOUNT_OUT_MIN = 350
    const AMOUNT_OUT: bigint = 100000000n
    // const AMOUNT_IN_MAX = 450
    const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F" // Toekn Out (DAI)
    const wBtcHolderAddreess = "0x1Cb17a66DC606a52785f69F08F4256526aBd4943" //WBTC Whale
    const wBtcAddress = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" // Token In (WBTC)
    const TO = "0x1Cb17a66DC606a52785f69F08F4256526aBd4943" // Whale

    // Initialization
    const stakers: any[] = []
    const N = 10 // N is the number of stakers
    const provider = ethers.provider.provider
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

    it("should pass", async function () {
        // Impersonating daiHolder's account
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [wBtcHolderAddreess],
        })
        AnimaguSwap = await ethers.getContractFactory("AnimaguSwap")
        animaguSwap = await AnimaguSwap.deploy()
        const animaguSwapAddress = await animaguSwap.getAddress()
        // Make wBtcHolder the signer
        const signerWBTCHolder = await ethers.getSigner(wBtcHolderAddreess)
        const AMOUNT_OUT_MIN = await animaguSwap.getAmountOutMin(
            wBtcAddress,
            daiAddress,
            AMOUNT_IN,
        )
        const AMOUNT_IN_MAX = await animaguSwap.getAmountInMax(
            daiAddress,
            wBtcAddress,
            AMOUNT_OUT,
        )
        const userWallet = new ethers.Wallet(userPrivateKey, provider)
        await network.provider.request({
            method: "hardhat_setBalance",
            params: [userWallet.address, "0x1000000000000000"],
        })
        const flipperWallet = new ethers.Wallet(flipperPrivateKey, provider)
        const stakerWallets: any[] = []
        for (let i = 0; i <= N; i++) {
            const privateKey = process.env[`PRIVATE_KEY_${i}`]

            if (!privateKey) {
                console.error(
                    `Private key for staker ${i} not found in .env file`,
                )
                continue
            }
            const wallet = new ethers.Wallet(privateKey, provider)
            // 0 is the flipper
            await network.provider.request({
                method: "hardhat_setBalance",
                params: [wallet.address, "0x1000000000000000"],
            })
            // print the balance
            if (i > 0) {
                stakers.push({
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                })
                stakerWallets[i - 1] = wallet
            }
        }
        //deposit
        for (let i = 0; i <= N; i++) {
            const depositAmount = ethers.parseEther("0.001") // or the amount you want to deposit
            let depositWallet, depositContract
            if (i == 0) {
                depositWallet = flipperWallet
            } else {
                depositWallet = stakerWallets[i - 1]
            }
            await animaguSwap.connect(depositWallet).deposit(depositAmount, {
                value: depositAmount,
            })
        }

        // Stage 1: transaction creation
        const random: number = 1 //randomBit()
        const B: number = 0 //randomBit()
        console.log("Random number:", random)
        console.log("B:", B)
        let buyTx
        let sellTx
        let tx
        let txb
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10
        const V = randomBit()
        const W = randomBit()
        console.log("W+V:", concatenateNumbers(W, V))
        const hashedWV = ethers.solidityPackedKeccak256(
            ["string"],
            [concatenateNumbers(W, V).toString()],
        )

        console.log("hashedWV:", hashedWV)
        // buy = swapTokensForExactTokens
        // Receive an exact amount of output tokens for as few input tokens as possible
        // AMOUT_OUT is exact amount
        // path[0] = input
        // path[path.length - 1] = output
        // DAI -> wBTC
        buyTx = await buildBuyTx(
            AMOUNT_OUT,
            AMOUNT_IN_MAX,
            wBtcAddress,
            daiAddress,
            TO,
            deadline,
            hashedWV,
        )
        // sell = swapExactTokensForTokens
        // Swaps an exact amount of input tokens for as many output tokens as possible
        // AMOUNT_IN is exact amount
        // path[0] = input
        // path[path.length - 1] = output
        // wBTC -> DAI
        sellTx = await buildSellTx(
            AMOUNT_IN,
            AMOUNT_OUT_MIN,
            wBtcAddress,
            daiAddress,
            TO,
            deadline,
            hashedWV,
        )
        let idealAmount: bigint

        if (random == 0) tx = buyTx
        else tx = sellTx

        if (B == 0) {
            txb = tx
            if (random == 0) idealAmount = AMOUNT_IN_MAX
            else idealAmount = AMOUNT_OUT_MIN
        } else if (random == 0) {
            txb = sellTx
            idealAmount = AMOUNT_OUT_MIN
        } else {
            txb = buyTx
            idealAmount = AMOUNT_IN_MAX
        }

        console.log("txb", txb)
        const commitment = ethers.solidityPackedKeccak256(["bytes"], [txb])
        console.log("commitment:", commitment) //hex
        // Stage2: transaction submission

        const commitTx = await animaguSwap
            .connect(signerWBTCHolder)
            .commit(commitment)
        await commitTx.wait()
        console.log("Commit transaction sent and mined.")

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
        const decryptedMessageHash = ethers.solidityPackedKeccak256(
            ["string"],
            [decryptedMessage],
        )
        const signerAddress = ethers.recoverAddress(
            decryptedMessageHash,
            signedCommitment,
        )

        const verifySignatureResult = await verifySignature(
            signedCommitment,
            decryptedMessage,
            flipperWallet.address,
        )
        if (verifySignatureResult) {
            console.log("Signature verified!")
            const secret = Buffer.from(txb)
            console.log("secret", secret)
            const shares = sss.split(secret, { shares: N, threshold: N })
            console.log("shares:", shares)
            const tree = new MerkleTree(shares, keccak256, { sort: true })
            const root = "0x" + tree.getRoot().toString("hex")
            const stakerData = stakers.map((staker, index) => {
                const proof = tree.getHexProof(shares[index])
                return {
                    stakerAddress: staker.address,
                    share: shares[index],
                    proof: proof,
                }
            })
            // Sign each 'share' and 'proof' with user's signature and verify to prevent malicious behavior by the user
            const stakerDataWithSignatures = []
            for (const data of stakerData) {
                // hardhat_impersonateAccount does not directly support message signing because it does not have access to the actual private key.
                // Therefore, we simulate a user wallet to perform digital signing.The principle is similar.
                // If the verification is successful, even if we obtain the private key of the simulated wallet, we can still sign successfully. Therefore, this does not affect the overall logic.
                const shareSignature = await signedMessage(
                    userWallet,
                    data.share,
                )
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
            const recoveredTx = sss.combine(shares.slice(0, N))
            const recoveredTxString = recoveredTx.toString()
            console.log("recoveredTx", recoveredTx)
            console.log("recoveredTxString", recoveredTxString)

            let flipperB = decryptedMessage[0]
            try {
                await animaguSwap.connect(flipperWallet).revealFlipper(flipperB)
            } catch (error) {
                console.error("Error when trying to reveal flipper:", error)
                throw error
            }
            console.log("Flipper revealed!")
            const privateKey = process.env[`PRIVATE_KEY_${1}`]
            const leaderStakerWallet = privateKey
                ? new ethers.Wallet(privateKey, provider)
                : undefined
            tokenIn = await ethers.getContractAt("IERC20", wBtcAddress)
            tokenOut = await ethers.getContractAt("IERC20", daiAddress)
            const wBtcBalanceBefore = await tokenIn.balanceOf(
                wBtcHolderAddreess,
            )
            const DAIBalanceBefore = await tokenOut.balanceOf(
                wBtcHolderAddreess,
            )
            console.log(
                "----------------------------------------------------------------",
            )
            console.log("wBTC Balance before: ", wBtcBalanceBefore)
            console.log("DAI Balance before: ", DAIBalanceBefore)
            const recoveredSignerWBTCHolder = await ethers.getSigner(String(TO))

            await tokenIn
                .connect(recoveredSignerWBTCHolder)
                .approve(animaguSwapAddress, wBtcBalanceBefore)
            await tokenOut
                .connect(recoveredSignerWBTCHolder)
                .approve(animaguSwapAddress, DAIBalanceBefore)
            await animaguSwap
                .connect(leaderStakerWallet)
                .revealStaker(recoveredTxString)
            const wBtcBalanceAfter = await tokenIn.balanceOf(TO)
            console.log(
                "----------------------------------------------------------------",
            )
            console.log("wBTC Balance after: ", wBtcBalanceAfter)

            const DAIBalanceAfter = await tokenOut.balanceOf(TO)
            console.log("DAI Balance After : ", DAIBalanceAfter)
            //Tf

            if (random == 1) {
                console.log(idealAmount)
                console.log(DAIBalanceAfter - DAIBalanceBefore - idealAmount)
                if (
                    DAIBalanceAfter - DAIBalanceBefore - idealAmount !=
                    BigInt(0)
                ) {
                    animaguSwap
                        .connect(recoveredSignerWBTCHolder)
                        .transactionF(
                            daiAddress,
                            flipperWallet.address,
                            DAIBalanceAfter - DAIBalanceBefore - idealAmount,
                        )
                }
            } else {
                console.log(wBtcBalanceAfter - wBtcBalanceBefore - idealAmount)
                if (
                    wBtcBalanceAfter - wBtcBalanceBefore - idealAmount !=
                    BigInt(0)
                ) {
                    animaguSwap
                        .connect(recoveredSignerWBTCHolder)
                        .transactionF(
                            wBtcAddress,
                            flipperWallet.address,
                            wBtcBalanceAfter - wBtcBalanceBefore - idealAmount,
                        )
                }
            }

            // userComplain
            console.log("signedCommitment:", signedCommitment)
            await animaguSwap
                .connect(recoveredSignerWBTCHolder)
                .complain(
                    signerAddress,
                    signedCommitment,
                    V.toString(),
                    W.toString(),
                )
        } else {
            console.log("Signature verification failed!")
        }
    })
})
