# AnimaguSwap
## 1 What is AnimaguSwap
- A novel Uniswap protocol that mitigates Sandwich Attacks in AMM 

- The scenario involves a user wishing to conduct a token exchange on Uniswap, using Token A to purchase Token B. We establish a defense mechanism by grouping flippers and stakers among nodes, creating a distrust.
## 2 Project Framework
- Hardhat 

- Fork from the ETH Mainnet

- Github: https://github.com/RyanFcr/AnimaguSwap
## 3 Project Limitation
- Instead of genuinely simulating N nodes locally, I emulate N wallet accounts using local variables.

- Some communication details have been omitted, with a primary focus on the contract aspect, the overall system implementation and the performance of the entire system, specifically in terms of gas fees.
## Usage
1. yarn install & fill up .env file
2. yarn deploy
3. npx hardhat test