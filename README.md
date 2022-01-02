# Parallel Markets Identity Token
This is the Parallel Markets smart contract code for the Identity Token on Ethereum.  It uses [Hardhat](https://hardhat.org) for contract building / testing.

## Setup / Installation
Just run:

```shell
> pnpm i
```

## Testing
This will run all tests / linters:

```shell
> pnpm test
```

## Gas Estimates
Use this to see what current costs are for contract calls:

```shell
> REPORT_GAS=true pnpm exec hardhat test
```

## Deployment
Ensure the network you'd like to deploy to is configured in `hardhat.config.js`, then run:

```shell
> pnpm exec hardhat run --network <network name> scripts/deploy.js
```

### Issuing Tokens
Edit the `scripts/mint.js` file with the address of the contract and token recipient, then run:

```shell
> pnpm exec hardhat run --network <network name> scripts/mint.js
```

### Etherscan verification
After deploying, run:

```shell
npx hardhat verify --network <network name> <contract address>
```

This will verify the contract on Etherscan (so everyone can see the source code).
