export function stringToHex(input: string): string {
    let hexResult = ""
    for (let i = 0; i < input.length; i++) {
        let hexChar = input.charCodeAt(i).toString(16) // Convert char to hex
        hexResult += hexChar
    }
    return hexResult
}
export function hexToString(hexInput: string): string {
    let stringResult = ""
    for (let i = 0; i < hexInput.length; i += 2) {
        let hexChar = hexInput.substring(i, i + 2) // Extract two characters
        let charCode = parseInt(hexChar, 16) // Convert those two characters to integer using base 16
        stringResult += String.fromCharCode(charCode) // Convert integer to char and append
    }
    return stringResult
}
