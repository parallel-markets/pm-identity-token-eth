// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const ParallelMarketsID = await hre.ethers.getContractFactory('ParallelMarketsID')
  const pmid = await ParallelMarketsID.attach('0xb31317ad3BD8e188D3848713b88ddC76C977e4C6')

  const addy = '0xf0495779260E786409c2ee6B85cE6Ef7B07377F8'
  const uri = 'https://parallelmarkets.com/token.json'
  await pmid.mintIdentityToken(addy, uri, ['kyc_clear', 'accredited'])
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
