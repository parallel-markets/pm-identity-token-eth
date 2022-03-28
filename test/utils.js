const { ethers } = require('hardhat')

const deploy = async (contractName) => {
  const factory = await ethers.getContractFactory(contractName)
  const contract = await factory.deploy()
  await contract.deployed()
  return contract
}

const fastForward = async (seconds) => {
  await ethers.provider.send('evm_increaseTime', [seconds])
  await ethers.provider.send('evm_mine')
}

module.exports = { deploy, fastForward }
