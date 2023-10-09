const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("AnimaguSwap", function () {
    let animaguSwap: any

    before(async function () {
        // 部署 AnimaguSwap 合约
        const AnimaguSwap = await ethers.getContractFactory("AnimaguSwap")
        animaguSwap = await AnimaguSwap.deploy()
    })

    it("should parse to address correctly from txbAsString", async function () {
        const txbAsString =
            "0x86dcd3293c53cf8efd7303b57beb2a3f671dde988803dbee0000000000000000000000000000000000000000000000008ac7230489e80000000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000e7f363a358c7cf07b8c59e3d5de7de494c21cfd6000000000000000000000000000000000000000000000000000000006523b7010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b140000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984"

        // Call the parseToFromTxb function
        // Assuming you have made it public for the purpose of testing
        const result = await animaguSwap.parseToFromTxb(txbAsString)

        // Expected address from the given input
        const expected = "0x86dcd3293c53cf8efd7303b57beb2a3f671dde98"

        expect(result).to.equal(expected)
    })
})
