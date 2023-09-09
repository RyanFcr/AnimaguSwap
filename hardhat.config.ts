import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
// import "@nomiclabs/hardhat-ethers"
// import "@nomiclabs/hardhat-waffle"
// import "@typechain/hardhat"

// import ("@nomiclabs/hardhat-etherscan")
import "dotenv/config"

let SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
let PRIVATE_KEY = process.env.PRIVATE_KEY || ""
let ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""

const config: HardhatUserConfig = {
    defaultNetwork: "sepolia",
    solidity: "0.8.7",
    networks: {
        hardhat: {
            accounts: [
                {
                    privateKey:
                        "0x7411afd59220b8040de5bad04c5af5b3d3538e3be6f711f80a994a6ca249619b",
                    balance: "10000000000000000000000", // 10,000 ETH
                },
            ],
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
}

export default config
