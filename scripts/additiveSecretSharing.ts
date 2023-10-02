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
        let share = BigInt(
            Math.floor(Number(Math.random() * Number(fieldSize))),
        )
        shares.push(share)
        sum = (sum + share) % fieldSize
    }

    // 计算最后一个分享，使其与其他随机数的总和等于秘密
    shares.push((secret - sum + fieldSize) % fieldSize) // 防止负数结果

    // 将 bigint 转换为字符串
    for (let i = 0; i < shares.length; i++) {
        stringShares.push(shares[i].toString())
    }

    return stringShares
}
