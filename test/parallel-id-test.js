const { expect } = require('chai')
const { ethers } = require('hardhat')

const { deploy, fastForward, now } = require('./utils')

const mint = async (addy, uri, traits, subjectType, citizenship) => {
  const pid = await deploy('ParallelID')
  const mintTx = await pid.mint(addy, uri, traits, subjectType, citizenship)
  await mintTx.wait()
  return pid
}

const getHolder = async () => {
  const signers = await ethers.getSigners()
  return signers[1]
}

const SUBJECT_INDIVIDUAL = 0
const SUBJECT_BUSINESS = 1

const TOKEN_COST = ethers.utils.parseUnits('8500000', 'gwei')

describe('Token mintCost', () => {
  it('should be set correctly and public', async () => {
    const pid = await deploy('ParallelID')
    expect(await pid.mintCost()).to.equal(TOKEN_COST)
  })

  it('should be settable by the owner', async () => {
    const pid = await deploy('ParallelID')
    const newCost = ethers.utils.parseUnits('10', 'ether')
    const tx = await pid.setMintCost(newCost)
    await tx.wait()
    expect(await pid.mintCost()).to.equal(newCost)
  })

  it('should not be settable by non-owners', async () => {
    const pid = await deploy('ParallelID')
    const signers = await ethers.getSigners()
    const newCost = ethers.utils.parseUnits('10', 'ether')
    const tx = pid.connect(signers[1]).setMintCost(newCost)
    await expect(tx).to.be.revertedWith('Ownable: caller is not the owner')
  })
})

describe('Token recipient minting', () => {
  const types = ['address', 'string', 'bytes32', 'uint16', 'uint16', 'uint256', 'address', 'uint256', 'uint']
  const options = { value: TOKEN_COST }
  const traits = ['kyc', 'aml', 'clear']
  const uri = 'cid://something'

  const hashStrings = (words) => {
    const bytes = ethers.utils.toUtf8Bytes(words.join('\0') + '\0')
    return ethers.utils.solidityKeccak256(['bytes'], [bytes])
  }

  it('should accept a valid signature', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() + 20

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await owner.signMessage(ethers.utils.arrayify(encoded))

    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, options)
    await expect(mintTx).to.emit(pid, 'Transfer').withArgs(ethers.constants.AddressZero, rando.address, 1)
  })

  it('should fail on invalid signer', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() + 20

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await rando.signMessage(ethers.utils.arrayify(encoded))

    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, options)
    await expect(mintTx).to.be.revertedWith('Invalid signature')
  })

  it('should fail on valid signature for different args', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() + 20

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await owner.signMessage(ethers.utils.arrayify(encoded))

    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_BUSINESS, 840, nowish, signature, options)
    await expect(mintTx).to.be.revertedWith('Invalid signature')
  })

  it('should fail if the recipient fails to pay enough', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() + 40

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await owner.signMessage(ethers.utils.arrayify(encoded))

    const lowValue = { value: ethers.utils.parseUnits('8499999', 'gwei') }
    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, lowValue)
    await expect(mintTx).to.be.revertedWith('Sufficient payment required')
  })

  it('should fail on replay of valid transaction', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() + 40

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await owner.signMessage(ethers.utils.arrayify(encoded))

    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, options)
    await expect(mintTx).to.emit(pid, 'Transfer').withArgs(ethers.constants.AddressZero, rando.address, 1)

    const reTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, options)
    await expect(reTx).to.be.revertedWith('Invalid signature')
  })

  it('should fail if too much time has passed', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() - 10

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await owner.signMessage(ethers.utils.arrayify(encoded))

    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, options)
    await expect(mintTx).to.be.revertedWith('Signature has expired')
  })

  it('should result in recoverable payments', async () => {
    const pid = await deploy('ParallelID')
    const [owner, rando] = await ethers.getSigners()
    const chainId = await owner.getChainId()
    const nowish = now() + 100

    const values = [rando.address, uri, hashStrings(traits), SUBJECT_INDIVIDUAL, 840, nowish, pid.address, 1, chainId]
    const encoded = ethers.utils.solidityKeccak256(types, values)
    const signature = await owner.signMessage(ethers.utils.arrayify(encoded))

    // contract shouldn't have any value yet
    expect(await rando.provider.getBalance(pid.address)).to.equal(0)

    const mintTx = pid.connect(rando).recipientMint(uri, traits, SUBJECT_INDIVIDUAL, 840, nowish, signature, options)
    await expect(mintTx).to.emit(pid, 'Transfer').withArgs(ethers.constants.AddressZero, rando.address, 1)

    // contract should now have value
    expect(await rando.provider.getBalance(pid.address)).to.equal(options.value)

    // and the withdrawal should result in the owner getting the value
    await expect(await pid.withdraw()).to.changeEtherBalance(owner, options.value)
  })
})

describe('Contract owner minting', () => {
  it('should initialize metadata correctly', async () => {
    const [owner, rando] = await ethers.getSigners()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)

    // the owner should have nothing
    expect(await pid.balanceOf(owner.address)).to.equal(0)

    // rando should have one token
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)
    expect(tokenId).to.equal(1)
    expect(await pid.balanceOf(rando.address)).to.equal(1)

    // mintedAt should be now
    expect(await pid.mintedAt(tokenId)).to.be.within(now() - 30, now() + 30)

    // citizenship
    expect(await pid.citizenship(tokenId)).to.equal(840)

    // subjectType
    expect(await pid.subjectType(tokenId)).to.equal(SUBJECT_INDIVIDUAL)

    // tokenURI
    expect(await pid.tokenURI(tokenId)).to.equal('uri')
  })

  it('should initialize traits correctly', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc', 'aml'], SUBJECT_BUSINESS, 840)

    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    expect(await pid.hasTrait(tokenId, 'kyc')).to.be.true
    expect(await pid.hasTrait(tokenId, 'aml')).to.be.true
    expect(await pid.hasTrait(tokenId, 'other')).to.be.false
    expect(await pid.traits(tokenId)).to.eql(['kyc', 'aml'])
  })
})

describe('Sanctions', () => {
  it('should start off empty and sanctions free', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    expect(await pid.isSanctionsSafe(tokenId)).to.be.true
    expect(await pid.isSanctionsSafeIn(tokenId, 840)).to.be.true
  })

  it('should not be sanctions safe after end of monitoring', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    expect(await pid.isSanctionsSafe(tokenId)).to.be.true
    expect(await pid.isSanctionsSafeIn(tokenId, 840)).to.be.true

    // let's time travel just over a year into the future
    await fastForward(86400 * 366)

    expect(await pid.isSanctionsSafe(tokenId)).to.be.false
    expect(await pid.isSanctionsSafeIn(tokenId, 840)).to.be.false
  })

  it('should support adding sanctions with emmitted event', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    // check SanctionsMatch event
    await expect(pid.addSanctions(tokenId, 840)).to.emit(pid, 'SanctionsMatch').withArgs(tokenId, 840)

    expect(await pid.isSanctionsSafe(tokenId)).to.be.false
    // not sanctions safe in 840
    expect(await pid.isSanctionsSafeIn(tokenId, 840)).to.be.false
    // still sanctions safe in this other country, though
    expect(await pid.isSanctionsSafeIn(tokenId, 834)).to.be.true
  })

  it('should know whether or not monitoring is current', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    expect(await pid.isSanctionsMonitored(tokenId)).to.be.true

    // let's time travel just over a year into the future
    await fastForward(86400 * 366)

    expect(await pid.isSanctionsMonitored(tokenId)).to.be.false
  })
})

describe('Traits', () => {
  it('should support additions and emit events', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    // check TraitAdded event
    await expect(pid.addTrait(tokenId, 'aml')).to.emit(pid, 'TraitAdded').withArgs(tokenId, 'aml')

    expect(await pid.hasTrait(tokenId, 'kyc')).to.be.true
    expect(await pid.hasTrait(tokenId, 'aml')).to.be.true
    expect(await pid.hasTrait(tokenId, 'other')).to.be.false
    expect(await pid.traits(tokenId)).to.eql(['kyc', 'aml'])
  })

  it('should support removals', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc', 'aml'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    // check TraitRemoved event
    await expect(pid.removeTrait(tokenId, 'aml')).to.emit(pid, 'TraitRemoved').withArgs(tokenId, 'aml')

    expect(await pid.hasTrait(tokenId, 'kyc')).to.be.true
    expect(await pid.hasTrait(tokenId, 'aml')).to.be.false
    expect(await pid.traits(tokenId)).to.eql(['kyc'])
  })
})

describe('Burning', () => {
  it('should be possible by the contract owner', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    expect(await pid.balanceOf(rando.address)).to.equal(1)
    await pid.burn(tokenId)
    expect(await pid.balanceOf(rando.address)).to.equal(0)
  })

  it('should be possible by the token holder', async () => {
    const rando = await getHolder()
    const pid = await mint(rando.address, 'uri', ['kyc'], SUBJECT_INDIVIDUAL, 840)
    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)

    expect(await pid.balanceOf(rando.address)).to.equal(1)
    await pid.connect(rando).burn(tokenId)
    expect(await pid.balanceOf(rando.address)).to.equal(0)
  })
})
