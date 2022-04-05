const { ethers, upgrades } = require('hardhat')

const deploy = async (contractName) => {
  const ParallelID = await ethers.getContractFactory(contractName)
  const contract = await upgrades.deployProxy(ParallelID, [])
  await contract.deployed()
  return contract
}

const fastForward = async (seconds) => {
  await ethers.provider.send('evm_increaseTime', [seconds])
  await ethers.provider.send('evm_mine')
}

const now = () => Math.ceil(new Date().getTime() / 1000)

module.exports = { deploy, fastForward, now }
