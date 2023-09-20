import { ethers, run, network } from "hardhat"
import * as fs from "fs"
import * as path from "path"
import { getWallets } from "./getWallet"
async function main() {
    const wallets = await getWallets()

    if (!wallets) {
        console.error("Unable to retrieve wallets.")
        return // 或者 throw new Error("Unable to retrieve wallets.")
    }

    const { userWallet, flipperWallet } = wallets

    const AnimaguSwapFactory = await ethers.getContractFactory("AnimaguSwap")
    console.log("Deploying AnimaguSwap...")
    const animaguSwap = await AnimaguSwapFactory.deploy()
    const address = await animaguSwap.getAddress()
    console.log("AnimaguSwap deployed to:", address)
    // if (network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
    //     // 6 blocks is sort of a guess
    //     // 要等一会才能在etherscan上看到
    //     await animaguSwap.deploymentTransaction
    //     await verify(address, [])
    // }
    const outputFolderPath = path.resolve(__dirname, "../output")
    if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath)
    }
    fs.writeFileSync(
        path.resolve(outputFolderPath, "AnimaguSwapAddress.txt"),
        address,
    )
}
const verify = async (contractAddress: string, args: any[]) => {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e: any) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
