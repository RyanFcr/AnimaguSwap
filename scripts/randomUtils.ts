export function randomBit(): number {
    // Create a Uint8Array with a length of 1
    let arr = new Uint8Array(1)
    // Populate the array with random values
    crypto.getRandomValues(arr)
    // Return the least significant bit of the first element (i.e., 0 or 1)
    return arr[0] & 1
}
