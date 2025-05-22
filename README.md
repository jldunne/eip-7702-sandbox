# EIP-7702 Sandbox

This repository provides a simulation environment to test EIP-7702 transaction behaviors, focusing on invalidation scenarios. It uses Kurtosis to run a private Ethereum testnet and a Node.js script (`simulate.js`) to generate EIP-7702 activity.

##  Prerequisites

Ensure you have the following installed:
1.  **Docker:** ([docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)) - Verify with `docker --version`.
2.  **Kurtosis CLI:** ([docs.kurtosis.com/install](https://docs.kurtosis.com/install)) - Verify with `kurtosis version`.
3.  **Node.js & npm:** (Version 18.x or 20.x recommended) ([nodejs.org](https://nodejs.org/)) - Verify with `node -v` and `npm -v`.
4.  **solcjs:** (Solidity Compiler for JavaScript, e.g., version 0.8.20 for included contracts)
    ```bash
    npm install -g solc@0.8.20
    ```
    Verify with `solcjs --version`.

## Setup Instructions

**1. Clone Repository:**
   ```bash
      git clone <your-repo-url>
      cd eip-7702-sandbox
   ```
## Configure Testnet & Accounts:
This project uses template files for your specific parameters. You will need to copy these templates and fill in your details. Ensure the actual configuration files (network_params.yaml, accounts.json, .env) are added to your .gitignore.

**Contract Artifacts:** This repository includes pre-compiled ABI files (in `transaction-simulator/compiled/`) and bytecode (embedded within `transaction-simulator/simulate.js`) for `Authorizable.sol` and `FactoryAuthorizable.sol`. If you modify these Solidity contracts (or want to use different contracts), you will need to recompile them using `solcjs` (see Prerequisites) and update these artifacts.

## Kurtosis Testnet Parameters (kurtosis-config/network_params.yaml):

Copy `kurtosis-config/network_params.template.yaml` to `kurtosis-config/network_params.yaml`.

Edit network_params.yaml and set:
   - Your desired network_id (Chain ID).
   - A 24-word test preregistered_validator_keys_mnemonic.
   - Update prefunded_accounts (as a JSON string) to include all EOA addresses you will use (main sender from .env and all delegating accounts from accounts.json), along with their initial test ETH balances in Wei.

## Delegating Accounts (accounts.json):

These are the EOAs whose code will be set by EIP-7702 in the simulation. Copy accounts.template.json to accounts.json in the project root.

Populate accounts.json with new, test-only private keys for each delegating account.

```
[
   { "name": "Account1", "privateKey": "0x_YOUR_PRIVATE_KEY_1" },
   { "name": "Account2", "privateKey": "0x_YOUR_PRIVATE_KEY_2" }
]
```

## Environment Variables (.env):

Create a .env file in the project root.
Add the following, replacing placeholder values:

```
# .env
SIMULATOR_PRIVATE_KEY="0x_YOUR_MAIN_SENDER_PRIVATE_KEY_HERE"
RPC_URL="[http://127.0.0.1](http://127.0.0.1):YOUR_GETH_RPC_PORT" 

# Simulation Parameters (adjust as needed)
ENV_NUM_AUTHORIZABLE_CONTRACTS=2
ENV_NUM_FACTORY_CONTRACTS=1
ENV_RUN_STALE_AUTH_NONCE_TEST=true
ENV_RUN_STATE_BASED_INVALIDATION_TEST=true
ENV_RUN_DELEGATED_CODE_NONCE_TEST=true
ENV_RUN_MIXED_LOAD_SIMULATION=false # Set to true for general load testing
ENV_MIXED_LOAD_ROUNDS=5
ENV_MIXED_LOAD_PERCENT_EIP7702=0.5
ENV_MIXED_LOAD_MAX_DELEGATIONS=2
```

`SIMULATOR_PRIVATE_KEY` is for the main EOA that deploys contracts and sponsors EIP-7702 transactions.
`RPC_URL` will be obtained after starting the Kurtosis sandbox (see below).

## Prepare Simulator Project & Contracts:

Install Node.js Dependencies:

```
cd transaction-simulator
npm install # Assumes package.json lists ethers and dotenv
cd ..
```

## Running the Simulation

Ensure your kurtosis-config/network_params.yaml is fully configured.
From the project root, run:

```
kurtosis enclave rm eip7702sandbox -f && kurtosis run --enclave eip7702sandbox [github.com/ethpandaops/ethereum-package](https://github.com/ethpandaops/ethereum-package) --args-file kurtosis-config/network_params.yaml
```

Wait for the enclave to start up.

After the sandbox is running, find the Geth RPC port. Update the RPC_URL in your .env file with this address. Ensure your .env and accounts.json are correctly populated.

```
node transaction-simulator/simulate.js
```

## Scenarios

The simulate.js script (when respective flags are enabled in .env) runs scenarios to test:

Stale Authorization Nonces: How an EOA's authorization fails if its nonce is outdated.
State-Based Call Invalidations: How concurrent actions on a delegated EOA can alter expected transaction outcomes.
Delegated Code Nonce Consumption: How delegated code performing actions like contract creation consumes the EOA's nonce, potentially invalidating its other pending transactions.
Mixed Load: A general simulation of mixed EIP-7702 and normal transactions.
