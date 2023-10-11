# AnimaguSwap
## 1 What is AnimaguSwap
- A novel Uniswap protocol that mitigates Sandwich Attacks in AMM 

- The scenario involves a user wishing to exchange tokens on Uniswap, using Token A to purchase Token B. We establish a defense mechanism by grouping flippers and stakers among nodes, creating distrust.
## 2 Project Framework
- Hardhat 

- Fork from the ETH Mainnet

- Github: https://github.com/RyanFcr/AnimaguSwap
## 3 Project Limitation
- Instead of genuinely simulating N nodes locally, I emulate N wallet accounts using local variables.

- Some communication details have been omitted, with a primary focus on the contract aspect, the overall system implementation and the performance of the entire system, specifically in terms of gas fees.

## 4 AnimaguSwap Details

**Initialization**

- 「Off Chain」Initialize user, flipper, and N stakers.
- 「On Chain」All stakers and flipper deposit.

**Generate Transaction：**

- 「Off Chain」B = randomBit()
- 「Off Chain」Tx' = if(B==0)?tx:~tx; Here tx is TransactionRequest
  - ~tx = tx == BUY? SELL;BUY
- 「Off Chain」W = randomBit(); W is designed so that anyone in possession of W can verify the flipper, allowing for the slashing of the flipper.
- 「Off Chain」V = randomBit(): The design of V is to prevent flipper cheats, ensuring that the flipper cannot send an identical signed message to the stakers.
- 「Off Chain」md.hash = hash(W|V)
- 「Off Chain」md.hash is a part of the transaction, owned by the User to slash flipper
- 「Off Chain」Convert the transaction information into a String(md.hash is not included), to be used for subsequent secret sharing.

**Transaction submission:**

- 「On Chain」User submit commitment= hash(Tx') and md.hash on chain
  - Commitments of these orders are put in an on-chain queue 
- 「Off Chain」User to F：The user concatenates B and V and then encrypts them using F's public key before sending to Flipper.
- 「Off Chain」F to User：F decrypts using its private key. Subsequently, the Flipper signs and sends it to the user. The user receives a signed commitment, OutU, which signifies the flipper's promise to reveal b later.
- 「Off Chain」User：The User verifies whether the signature is from F and retains the OutU.
- 「Off Chain」The User splits Tx' into N shares using SS (Secret Sharing) and calculates the Merkle root along with its corresponding Merkle proof. This is then signed and sent to the Stakers (using **shamir secret share** because we need to satisfy that once threshold is met, we can recover the secret). 
- 「Off Chain」The Staker uses the signed ssi and proof for verification. If verification fails, the user is considered malicious. 

**Transaction inclusion：**

- 「Off Chain」Stakers reconstruct Tx' off-chain
- 「On Chain」Then one of the stakers submits args of message call from reconstructTx' .
  - If same, proceed to next step, for each element in the FIFO queue, the smart contract does the following: wait for stakers to reconstruct TX, wait for flipper to reveal b(Smart contracts cannot wait, smart contracts cannot be asynchronous. I simulated asynchronous behavior through my frontend script). Once it has both, contract receives args of message call from reconstructTx' and verifies that the args are from the reconstructTx’ and computes the hash(reconstructTx’)==the hash in the commitments queue. And then it will make a message call to the Uniswap for execution, forwarding the "real" transaction.
    - Return deposits of all stakers
  - If not same, a warning
  - The leader would be charged some amount, but would be refunded the amount by some fee mechanism

**Transaction revealing:**

- 「On Chain」Flipper reveal b on chain
- 「On Chain」from (reconstructTx', b) recover Tx ，
  -  (reconstructTx', b)  is a message call, but an EOA transaction
- 「On Chain」To incentivize the flipper to not reveal the flip bit (b)， the user creates another transaction txF which pays the flipper F some amount of tokens if the other stakers attempt to sandwich the transaction but guess the polarity incorrectly. The user pays the flipper $$b(\Delta r_y^‘ -\Delta r_y)+(1-b)(\Delta r_y-\Delta r_y^‘)$$

- 「On Chain」when user finds flipper cheats user call userComplain(OutU = signed(B|V)，V，W）：First, verify if the hash of V, W is _hashWV. If it is, then compare the hash(B|V).
  - If same, return deposit of the flipper

## 5 Performance

### Baseline

- Forking ETH Mainnet
- wBTC->DAI
- AmountIn = 100000000n; AmountOutMin = 26702388952633220168196n
  - swap 100000000n wBTC to 26702388952633220168196n DAI
- Staker Number: 2
- Secret sharing  threshold: 2

![baseline](img/baseline.png)

I’m doing more tests……

## 6 Usage

1. yarn install & fill up .env file
2. yarn deploy
3. npx hardhat test

