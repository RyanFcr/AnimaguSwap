def add_hex_numbers():
    # 输入两个16进制数
    num1 = input("请输入第一个16进制数: ")
    num2 = input("请输入第二个16进制数: ")

    # 将16进制数转换为10进制整数
    dec_num1 = int(num1, 16)
    dec_num2 = int(num2, 16)

    # 求和
    result = dec_num1 + dec_num2

    # 将10进制整数转换回16进制
    hex_result = hex(result)[2:].upper()  # 我们使用[2:]来移除'0x'前缀

    print(f"{hex_result}")

# 执行函数
add_hex_numbers()
