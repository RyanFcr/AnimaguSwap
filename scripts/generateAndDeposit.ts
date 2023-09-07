import { ethers } from "hardhat"

async function main() {
    const stakerWallets: any[] = []
    const N = 10

    const userPrivateKey = process.env.PRIVATE_KEY

    if (!userPrivateKey) {
        console.error("Private key not found in .env file")
        return
    }

    const userWallet = new ethers.Wallet(userPrivateKey, ethers.provider)

    console.log("Address:", userWallet.address)

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

    //Uniswap-V2 router on sepolia: 0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
