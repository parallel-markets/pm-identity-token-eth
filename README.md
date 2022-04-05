# Parallel Markets Identity (PID) Token

The Parallel Identity (PID) Token is a non-transferrable, non-fungible token (NFT) that links real world individual and business identities with Ethereum wallet addresses.  The PID Token provides accreditation, [Know Your Customer (KYC)](https://developer.parallelmarkets.com/docs/token#know-your-customer), and [international sanctions information](https://developer.parallelmarkets.com/docs/token#sanctions-monitoring) in the form of a [ERC-721](https://eips.ethereum.org/EIPS/eip-721) compatible token.

The PID Token has a number of features:

 1. Parallel Markets provides ongoing sanctions monitoring information **on-chain** for every PID Token holder for a year after minting
 1. Individuals (natural persons) _and_ businesess (any form of corporate entity) can have a PID Token
 1. Tokens can contain additional _traits_, including accreditation status and other DeFi-related information
 1. While **no PII is stored in the Token**, every Token holder has gone through a [rigorous KYC process](https://developer.parallelmarkets.com/docs/token#know-your-customer), including for any business/corporate entity that owns the wallet

See our [Developer Docs](https://developer.parallelmarkets.com/docs/token) for more information.

## Getting Started

You can access PID Token information either directly on-chain on the Ethereum Mainnet or via one of the Web3 JavaScript libraries.

### Ethereum Contract Access

Here's a quick example example of usage on-chain to determine if a Token holder (individual or business) is currently accredited and free from sanctions.

```sol
import "@parallelmarkets/token/contracts/IParallelID.sol";

contract MyContract {
    // Address on the Rinkeby test network
    address PID_CONTRACT = "0x91E498A0a9B47EEA5F8ba6c2553789BacbBED561";

    function isSanctionsSafe(address subject) returns (bool) {
        // Get a handle for the Parallel Identity Token contract
        IParallelID pid = IParallelID(PID_CONTRACT);

        // It's possible a subject could have multiple tokens issued over time - check
        // to see if any are currently monitored and safe from sanctions
        for (uint256 i = 0; i < pid.balanceOf(subject); i++) {
            uint256 tokenId = pid.tokenOfOwnerByIndex(subject, i);
            if (pid.isSanctionsSafe(tokenId)) return true;
        }
        return false;
    }

    function currentlyAccredited(address subject) returns (bool) {
        // Get a handle for the Parallel Identity Token contract
        IParallelID pid = IParallelID(PID_CONTRACT);

        // It's possible a subject could have multiple tokens issued over time - check
        // to see if any have an "accredited" trait and were minted in the last 90 days
        // (US regulation says accreditation certification only lasts 90 days)
        for (uint256 i = 0; i < pid.balanceOf(subject); i++) {
            uint256 tokenId = pid.tokenOfOwnerByIndex(subject, i);
            bool recent = pid.mintedAt(tokenId) >= block.timestamp - 90 days;
            bool accredited = pid.hasTrait(tokenId, "accredited");
            if (recent && accredited) return true;
        }
        return false;
    }
}
```

### dApp JavaScript Access

This example uses the [ethers.js](https://docs.ethers.io/v5/) library.

```js
import { utils, Contract } from 'ethers'

const abi = [
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256 balance)",
  "function hasTrait(uint256 tokenId, string memory trait) view returns (bool)",
  "function isSanctionsSafe(uint256 tokenId) view returns (bool)"
]

// Address on the Rinkeby test network
const PID_CONTRACT = "0x91E498A0a9B47EEA5F8ba6c2553789BacbBED561"
const contract = new Contract(PID_CONTRACT, abi, provider)

const isSanctionsSafe = (address) => {
  for (let i = 0; i < contract.balanceOf(address); i++) {
    const tokenId = contract.tokenOfOwnerByIndex(address, i)
    if (contract.isSanctionsSafe(tokenId)) return true
  }
  return false
}

const currentlyAccredited = (address) => {
  const ninetyDaysAgo = ((new Date()).getTime() / 1000) - (90 * 86400)
  for (let i = 0; i < contract.balanceOf(address); i++) {
    const tokenId = contract.tokenOfOwnerByIndex(address, i)
    const recent = contract.mintedAt(tokenId) >= ninetyDaysAgo
    const accredited = contract.hasTrait(tokenId, "accredited")
    if (recent && accredited) return true
  }
  return false
}
```

## Development

We use [Hardhat](https://hardhat.org) for contract building / testing.

### Setup / Installation


Just run:

```shell
> pnpm i
```

### Testing
This will run all tests / linters:

```shell
> pnpm test
```

### Gas Estimates
Use this to see what current costs are for contract calls:

```shell
> OPTIMIZE=true REPORT_GAS=true pnpm exec hardhat test
```

### Deployment
Ensure the network you'd like to deploy to is configured in `hardhat.config.js`, then run:

```shell
> OPTIMIZE=true pnpm exec hardhat run --network <network name> scripts/deploy.js
```

### Issuing Tokens
Edit the `scripts/mint.js` file with the address of the contract and token recipient, then run:

```shell
> pnpm exec hardhat run --network <network name> scripts/mint.js
```

Note - this is just for testing; production token minting is done via the `recipientMint` function.

### Etherscan verification
After deploying, run:

```shell
pnpm exec hardhat verify --network <network name> <contract address>
```

This will verify the contract on Etherscan (so everyone can see the source code).
