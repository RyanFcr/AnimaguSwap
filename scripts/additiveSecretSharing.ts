function randomBigIntBelow(maxValue: bigint): bigint {
    // const byteSize = (maxValue.toString().length + 7) >> 3 // Calculate byte length
    // let rand: bigint
    // do {
    //     const bytes = new Uint8Array(byteSize)
    //     crypto.getRandomValues(bytes)
    //     rand = BigInt(
    //         "0x" +
    //             Array.from(bytes)
    //                 .map((b) => b.toString(16).padStart(2, "0"))
    //                 .join(""),
    //     )
    // } while (rand >= maxValue)
    // return rand
    const randomBigInt = (max: bigint): bigint => {
        const randomBytes = require("crypto").randomBytes
        const buffer = randomBytes(64)
        let rand = BigInt("0x" + buffer.toString("hex"))
        return rand % max
    }

    if (maxValue <= 0n) {
        throw new Error("Input should be greater than 0.")
    }

    return randomBigInt(maxValue)
}

export function additiveSecretSharing(
    secret: bigint,
    n: number,
    // fieldSize: bigint,
): string[] {
    let shares: bigint[] = []
    let stringShares: string[] = []
    let sum: bigint = BigInt(0)
    // let ActualSum: bigint = BigInt(0)

    let leftNumber = secret
    // 选择 n-1 个随机数
    for (let i = 0; i < n - 1; i++) {
        let share = randomBigIntBelow(leftNumber)
        shares.push(share)
        sum = sum + share
        leftNumber = leftNumber - share
    }

    // 计算最后一个分享，使其与其他随机数的总和等于秘密
    shares.push(secret - sum) // 防止负数结果

    // for (let i = 0; i < shares.length; i++) {
    //     console.log("share " + i + ": " + shares[i].toString(16))
    //     ActualSum = ActualSum + shares[i]
    // }
    // console.log("ActualSum: " + ActualSum.toString(16))
    // 将 bigint 转换为字符串
    for (let i = 0; i < shares.length; i++) {
        stringShares.push("0x" + shares[i].toString(16))
    }

    return stringShares
}
