import * as crypto from "crypto"
import { promises as fs } from "fs"

async function generateRandomKey(length: number): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length, (err, buffer) => {
            if (err) {
                reject("Error generating random bytes: " + err)
            } else {
                resolve(buffer.toString("hex")) // 转换为十六进制字符串
            }
        })
    })
}

async function saveKeysToFile(filename: string, keys: string[]): Promise<void> {
    // 将秘钥数组合并成一个字符串，每个秘钥占一行
    const formattedKeys = keys.join("\n")

    try {
        await fs.writeFile(filename, formattedKeys, { encoding: "utf-8" })
        console.log(`Keys have been saved to ${filename}`)
    } catch (error) {
        console.error("Error writing keys to file: ", error)
        throw error // 重新抛出异常，以便调用函数可以捕获
    }
}

async function main() {
    const keyLength = 32 // 定义秘钥长度（字节）
    const filename = "secret-keys.txt"
    const totalKeys = 12 // 要生成的秘钥数量

    try {
        // 创建一个秘钥数组
        const keys: string[] = []
        for (let i = 0; i < totalKeys; i++) {
            const key = await generateRandomKey(keyLength)
            keys.push("0x" + key)
            console.log(`Generated Key ${i + 1}: `, key)
        }

        // 保存所有秘钥到文件
        await saveKeysToFile(filename, keys)
    } catch (error) {
        console.error("Error: ", error)
    }
}

// 执行主函数
main()
