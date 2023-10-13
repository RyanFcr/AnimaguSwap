import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
// import "@nomiclabs/hardhat-ethers"
// import "@nomiclabs/hardhat-waffle"
// import "@typechain/hardhat"

// import ("@nomiclabs/hardhat-etherscan")
import "@nomicfoundation/hardhat-verify"
import "dotenv/config"
import "hardhat-gas-reporter"
import "@typechain/hardhat"

let SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
let PRIVATE_KEY = process.env.PRIVATE_KEY || ""
let ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
let COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""
let ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ""

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 400,
            },
            outputSelection: {
                "*": {
                    "*": ["*"],
                },
            },
            viaIR: true, // 这里启用viaIR
        },
    },
    networks: {
        hardhat: {
            forking: {
                url: ALCHEMY_API_KEY,
            },
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
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: "b8043906-b8af-4099-8d97-81f9c7e69030",
        token: "ETH",
        showMethodSig: true,
        gasPrice: 21,
    },
}

export default config
