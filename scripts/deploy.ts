// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `yarn hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import { ethers, run, network } from "hardhat"

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const SimpleStorageFactory = await ethers.getContractFactory("SimpleStorage")
  console.log("Deploying contract...")
  const simpleStorage = await SimpleStorageFactory.deploy()
  // const transactionResponse = simpleStorage.deploymentTransaction();
  // await transactionResponse?.wait();

  const address = await simpleStorage.getAddress();
  console.log("Simple Storage deployed to:", address);
  // We only verify on a testnet!
  if (network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
    // 6 blocks is sort of a guess
    await simpleStorage.deploymentTransaction
    await verify(address, [])
  }
  console.log("Simple Storage deployed to:", address)


}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
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