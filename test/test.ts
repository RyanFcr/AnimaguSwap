// import { ethers } from "ethers"

import { AnySrvRecord } from "dns"

const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("AnimaguSwap", function () {
    let animaguSwap: {
        parseHexStringToBigInt: (hexString: string) => AnySrvRecord
        recoverSecret: (arg0: string[]) => any
        interface: { parseLog: (arg0: any) => any } // 这是解析日志所需要的
    } // 定义变量

    before(async function () {
        // 部署 AnimaguSwap 合约
        const AnimaguSwap = await ethers.getContractFactory("AnimaguSwap")
        animaguSwap = await AnimaguSwap.deploy()
    })
    it("should recover secret correctly", async function () {
        // const shares = ["0x1", "0x2"]
        const hexString = "0x1"
        // 调用合约
        const result = await animaguSwap.parseHexStringToBigInt(hexString)
        // const secret = await animaguSwap.recoverSecret(shares)
        // const receipt = await result.wait()
        // for (const log of receipt.logs) {
        //     try {
        //         const parsedLog = animaguSwap.interface.parseLog(log)
        //         console.log("Event:", parsedLog.name)
        //         for (const [key, value] of Object.entries(parsedLog.args)) {
        //             if (typeof value === "string") {
        //                 console.log(key, value) // 直接打印字符串
        //             } else if (typeof value === "number") {
        //                 console.log(key, value.toString()) // 转换数字为字符串并打印
        //             } else if (ethers.BigNumber.isBigNumber(value)) {
        //                 console.log(key, value) // 使用BigNumber的toString方法
        //             } else if (typeof value === "boolean") {
        //                 console.log(key, value.toString()) // 转换布尔值为字符串并打印
        //             } else {
        //                 console.log(key, "Unknown type:", typeof value)
        //             }
        //         }
        //     } catch (e) {
        //         // Log wasn't from the contract being tested; ignore it
        //     }
        // }
        const expected = [1]
        // 对比结果
        expect(result).to.deep.equal(expected)
    })
})
