const { expect } = require('chai')
const { ethers } = require('hardhat')

const { deploy, fastForward } = require('./utils')

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

    // lastIssuedAt and mintedAt should be now
    const now = Math.round(new Date().getTime() / 1000)
    expect(await pid.mintedAt(tokenId)).to.be.within(now - 20, now + 20)
    expect(await pid.lastIssuedAt(tokenId)).to.be.within(now - 20, now + 20)

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

describe('Renewing', () => {
  it('should reset/set metadata correctly', async () => {
    const pid = await deploy('ParallelID')
    const rando = await getHolder()

    const mintTx = await pid.mint(rando.address, 'old', ['kyc', 'aml'], SUBJECT_INDIVIDUAL, 840)
    await mintTx.wait()

    // Time travel!  Go 1 day into the future.
    const now = Math.round(new Date().getTime() / 1000)
    const future = now + 86400
    await fastForward(86400)

    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)
    const renewTx = await pid.renew(tokenId, 'new', ['kyc', 'blah'], 834)
    await renewTx.wait()

    // still just one token
    expect(await pid.balanceOf(rando.address)).to.equal(1)

    // mintedAt should still be "now"
    expect(await pid.mintedAt(tokenId)).to.be.within(now - 20, now + 20)

    // lastIssuedAt should be 1 day in the future
    expect(await pid.lastIssuedAt(tokenId)).to.be.within(future - 20, future + 20)

    // citizenship should be different now
    expect(await pid.citizenship(tokenId)).to.equal(834)

    // subjectType should not have changed
    expect(await pid.subjectType(tokenId)).to.equal(SUBJECT_INDIVIDUAL)

    // tokenURI should be different too
    expect(await pid.tokenURI(tokenId)).to.equal('new')
  })

  it('should reset traits correctly', async () => {
    const pid = await deploy('ParallelID')
    const rando = await getHolder()

    const mintTx = await pid.mint(rando.address, 'old', ['kyc', 'aml'], SUBJECT_INDIVIDUAL, 840)
    await mintTx.wait()

    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)
    const renewTx = await pid.renew(tokenId, 'new', [], 840)
    await renewTx.wait()

    expect(await pid.traits(tokenId)).to.eql([])
    // make sure the original 'kyc', 'aml' traits are really gone
    expect(await pid.hasTrait(tokenId, 'kyc')).to.be.false
    expect(await pid.hasTrait(tokenId, 'aml')).to.be.false
  })

  it('should set new traits correctly', async () => {
    const pid = await deploy('ParallelID')
    const rando = await getHolder()

    const mintTx = await pid.mint(rando.address, 'old', ['kyc', 'aml'], SUBJECT_INDIVIDUAL, 840)
    await mintTx.wait()

    const tokenId = await pid.tokenOfOwnerByIndex(rando.address, 0)
    const renewTx = await pid.renew(tokenId, 'new', ['kyc', 'blah'], 840)
    await renewTx.wait()

    expect(await pid.traits(tokenId)).to.eql(['kyc', 'blah'])
    // make sure the original 'aml' trait is really gone
    expect(await pid.hasTrait(tokenId, 'aml')).to.be.false
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
