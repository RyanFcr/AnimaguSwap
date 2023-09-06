import { ethers } from "hardhat"
import crypto from "crypto"

async function main() {
    const stakerWallets: any[] = []
    const userWallet: any[] = []
    const N = 10

    const wallet = ethers.Wallet.createRandom()
    userWallet.push({
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
    })

    for (let i = 0; i <= N; i++) {
        // N is the number of stakers
        const wallet = ethers.Wallet.createRandom()
        stakerWallets.push({
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
        })
    }

    console.log("userWallet:\n")
    console.log(userWallet)
    console.log("stakerWallets:\n")
    console.log(stakerWallets)

    //DAI：USDT = 1:1
    //BUY(Y, X, Δr_Y, Δr_X, s, md)=SwapTokensforExactTokens
    //SELL(X, Y, Δr_X, Δr_Y, s, md)=SwapExactTokensForTokens
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
