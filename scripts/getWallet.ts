import { ethers } from "hardhat"

export async function getWallets() {
    const userPrivateKey = process.env.PRIVATE_KEY
    const flipperPrivateKey = process.env[`PRIVATE_KEY_${0}`]
    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""

    if (!userPrivateKey) {
        console.error("Private key not found in .env file")
        return null
    }

    if (!flipperPrivateKey) {
        console.error(`Private key for staker ${0} not found in .env file`)
        return null
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const userWallet = new ethers.Wallet(userPrivateKey, provider)
    const flipperWallet = new ethers.Wallet(flipperPrivateKey, provider)

    return {
        userWallet: userWallet,
        flipperWallet: flipperWallet,
    }
}

// const wallets = await getWallets();

// if (!wallets) {
//     console.error("Unable to retrieve wallets.");
//     return;  // 或者 throw new Error("Unable to retrieve wallets.")
// }

// const { userWallet, flipperWallet } = wallets;
