# IBT_final_project
Execution Guide

### **Phase 1: Ethereum Side (EVM)**

**Terminal 1: Start the Local Node**

```bash
# Start a local Ethereum node using Anvil
anvil

```

**Terminal 2: Deploy & Interact**

```bash
# Deploy the IBTToken contract
forge create --rpc-url http://127.0.0.1:8545 --private-key <PRIVATE_KEY> src/IBTToken.sol:IBTToken

# Mint tokens to your MetaMask address
cast send <CONTRACT_ADDRESS> "mint(address,uint256)" <YOUR_ADDRESS> 1000000000000000000000 --rpc-url http://127.0.0.1:8545 --private-key <PRIVATE_KEY>

# Check balance
cast call <CONTRACT_ADDRESS> "balanceOf(address)(uint256)" <YOUR_ADDRESS> --rpc-url http://127.0.0.1:8545

```

---

### **Phase 2: Sui Side (Move)**

**Terminal 3: Start the Local Network**

```bash
# Start a local Sui network
sui-test-validator

```

**Terminal 4: Build & Publish**

```bash
# Move to the sui directory
cd sui_ibt_token

# Build the Move package
sui move build

# Publish to local network
sui client publish --gas-budget 100000000

```

---

### **Phase 3: The Frontend (Web App)**

**Terminal 5: Run the UI**

```bash
# Navigate to the webapp directory
cd webapp

# Install dependencies
npm install

# Start the development server
npm run dev

```
