function randomBigIntBelow(maxValue: bigint): bigint {
    const byteSize = (maxValue.toString().length + 7) >> 3 // Calculate byte length
    let rand: bigint
    do {
        const bytes = new Uint8Array(byteSize)
        crypto.getRandomValues(bytes)
        rand = BigInt(
            "0x" +
                Array.from(bytes)
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join(""),
        )
    } while (rand >= maxValue)
    return rand
}

export function additiveSecretSharing(
    secret: bigint,
    n: number,
    fieldSize: bigint,
): string[] {
    let shares: bigint[] = []
    let stringShares: string[] = []
    let sum: bigint = BigInt(0)

    // 选择 n-1 个随机数
    for (let i = 0; i < n - 1; i++) {
        let share = randomBigIntBelow(fieldSize)
        shares.push(share)
        sum = (sum + share) % fieldSize
    }

    // 计算最后一个分享，使其与其他随机数的总和等于秘密
    shares.push((secret - sum + fieldSize) % fieldSize) // 防止负数结果

    // 将 bigint 转换为字符串
    for (let i = 0; i < shares.length; i++) {
        stringShares.push("0x" + shares[i].toString(16))
    }

    return stringShares
}
