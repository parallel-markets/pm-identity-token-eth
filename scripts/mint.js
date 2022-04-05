// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat')

const SUBJECT_INDIVIDUAL = 0

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const factory = await ethers.getContractFactory('ParallelID')
  const contract = await factory.attach('0x91E498A0a9B47EEA5F8ba6c2553789BacbBED561')

  const uri = 'ipfs://QmPdP2Uw3nEUojBujVf9XqCrxxRhsXrxxMJ7ZipURunXUp'
  const addy = '0xf0495779260E786409c2ee6B85cE6Ef7B07377F8'

  await contract.mint(addy, uri, ['kyc'], SUBJECT_INDIVIDUAL, 840)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
