const { expect } = require("chai")
const { ethers } = require("hardhat")
// import { ethers, waffle } from "hardhat";
// import { expect } from "chai";
// import { AnimaguSwap } from "../typechain/AnimaguSwap";
// import { IERC20 } from "../typechain/IERC20";

// const { deployContract } = waffle;
describe("AnimaguSwap", function () {
    let animaguSwap: any
    let weth: any
    before(async function () {
        // 部署 AnimaguSwap 合约
        const AnimaguSwap = await ethers.getContractFactory("AnimaguSwap")
        animaguSwap = await AnimaguSwap.deploy()
        // const IERC20Factory = await ethers.getContractFactory("IERC20")
        // weth = await IERC20Factory.attach(
        //     "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
        // )
    })

    it("should parse to address correctly from txbAsString", async function () {
        // Call the parseToFromTxb function
        // Assuming you have made it public for the purpose of testing

        const result = await animaguSwap.commitAndExecute(1e14, 1e14)

        // Expected address from the given input
        // const expected = "0x86dcd3293c53cf8efd7303b57beb2a3f671dde98"

        // expect(result).to.equal(expected)
    })
})
