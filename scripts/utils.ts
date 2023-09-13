// utils.ts

import { ethers } from "hardhat"

export function encodeWithoutPrefix(str: string): string {
    // 如果字符串以'0x'开始，则去掉它
    if (str.startsWith("0x")) {
        str = str.slice(2)
    }
    let _bytes = ethers.toUtf8Bytes(str)
    console.log(_bytes.length)
    return ethers.encodeBytes32String(str)
}
