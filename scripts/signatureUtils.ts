import { ethers } from "hardhat"

export async function signedMessage(wallet: any, message: string) {
    return await wallet.signMessage(message)
}

export const verifySignature = async (
    signature: string,
    message: string,
    address: any,
) => {
    // 从签名中恢复地址
    const recoveredAddress = ethers.verifyMessage(message, signature)

    // 检查恢复的地址是否与Flipper的地址匹配
    return recoveredAddress === address
}
