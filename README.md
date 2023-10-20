# AnimaguSwap
## 1 What is AnimaguSwap
- A novel Uniswap protocol that mitigates Sandwich Attacks in AMM 

- The scenario involves a user wishing to exchange tokens on Uniswap, using Token A to purchase Token B. We establish a defense mechanism by grouping flippers and stakers among nodes, creating distrust.
## 2 Project Framework
- Hardhat 

- Fork from the ETH Mainnet

## 3 Project Limitation
- Instead of genuinely simulating N nodes locally, I emulate N wallet accounts using local variables.

- Some communication details have been omitted, with a primary focus on the contract aspect, the overall system implementation and the performance of the entire system, specifically in terms of gas fees.
## 4 Performance

### Baseline

- Forking ETH Mainnet
- wBTC->DAI
- AmountIn = 100000000n; AmountOutMin = 26283178705806160790323n
  - swap 100000000n wBTC to 26283178705806160790323n DAI
- Staker Number: 10
- Secret sharing  threshold: 10

![baseline](img/baseline.png)

## 5 Usage
### Mac M1
1. git clone the repository and please install yarn.
2. Run 'yarn install' in the command line.
3. Run 'yarn generate' in the command line.
   1. To generate 12 private keys which we will use later. The key will be outputted in the 'secret-keys.txt' file.

4. fill up .env file.
   1. SEPOLIA_RPC_URL: you can go to [Alchemy](https://www.alchemy.com/) to register a https format sepolia testnet api key.
   2. PRIVATE_KEY: PRIVATE_KEY is the private key for "user" in our design. You can use the private key we generated before.
   3. COINMARKETCAP_API_KEY: you can go to [CoinMarketCap](https://coinmarketcap.com/api/) to get your coinmarketcap api key.
   4. ETHMAINNET_RPC_URL:  you can go to [Alchemy](https://www.alchemy.com/) to register a https format eth-mainnet api key.
   5. PRIVATE_KEY_0-10: PRIVATE_KEY_0 is the private key for "flipper" in our design and PRIVATE_KEY1-10 are the private keys for "staker1-10" in our design. You can use the private key we generated before.

5. Run 'yarn deploy' in the command line.
6. Run 'yarn test' in the command line.

