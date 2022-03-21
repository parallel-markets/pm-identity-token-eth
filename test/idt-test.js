const { expect } = require('chai')
const { ethers } = require('hardhat')

const deploy = async function () {
  const ParallelMarketsID = await ethers.getContractFactory('ParallelMarketsID')
  const pmid = await ParallelMarketsID.deploy()
  await pmid.deployed()
  return pmid
}

const getTestAccount = async function () {
  const signers = await ethers.getSigners()
  // first signer is the owner of the contract, so use the second addy
  return signers[1]
}

const fastForward = async function (seconds) {
  const now = Math.round(new Date().getTime() / 1000)
  await ethers.provider.send('evm_setNextBlockTimestamp', [now + seconds])
  await ethers.provider.send('evm_mine')
}

describe('ParallelMarketsID traits', function () {
  it('should be initialized correctly', async function () {
    const pmid = await deploy()

    // mint a token
    const [owner, rando] = await ethers.getSigners()
    const uri = 'https://google.com'
    const mintTx = await pmid.mintIdentityToken(rando.address, uri, ['kyc_clear'])
    await mintTx.wait()

    // the owner should have nothing
    expect(await pmid.balanceOf(owner.address)).to.equal(0)

    const tokenId = await pmid.tokenOfOwnerByIndex(rando.address, 0)
    expect(await pmid.balanceOf(rando.address)).to.equal(1)
    expect(await pmid.trait(tokenId, 'kyc_clear')).to.be.true
    expect(await pmid.trait(tokenId, 'blurp')).to.be.false

    const now = Math.round(new Date().getTime() / 1000)
    expect(await pmid.mintedAt(tokenId)).to.be.within(now - 15, now + 15)
    expect(await pmid.tokenURI(tokenId)).to.equal(uri)
    expect(await pmid.unexpired(tokenId)).to.be.true
  })

  it('should be settable', async function () {
    const pmid = await deploy()

    const rando = await getTestAccount()
    const uri = 'https://google.com'
    const mintTx = await pmid.mintIdentityToken(rando.address, uri, ['kyc_clear'])
    await mintTx.wait()

    const tokenId = await pmid.tokenOfOwnerByIndex(rando.address, 0)
    const updateTx = await pmid.setTrait(tokenId, 'accreditation', true)
    await updateTx.wait()
    expect(await pmid.trait(tokenId, 'accreditation')).to.be.true

    const updateTwoTx = await pmid.setTrait(tokenId, 'accreditation', false)
    await updateTwoTx.wait()
    expect(await pmid.trait(tokenId, 'accreditation')).to.be.false
  })

  it('should emit event when set', async function () {
    const pmid = await deploy()

    const rando = await getTestAccount()
    const uri = 'https://google.com'
    const mintTx = await pmid.mintIdentityToken(rando.address, uri, ['kyc_clear'])
    await mintTx.wait()

    const tokenId = await pmid.tokenOfOwnerByIndex(rando.address, 0)
    await expect(pmid.setTrait(tokenId, 'accreditation', true)).to.emit(pmid, 'TraitUpdated').withArgs(tokenId, 'accreditation', true)
  })

  it('should know when an address has an unexpired trait', async function () {
    const pmid = await deploy()

    const [owner, rando] = await ethers.getSigners()
    const uri = 'https://google.com'
    const kycTx = await pmid.mintIdentityToken(rando.address, uri, ['kyc_clear'])
    await kycTx.wait()

    const accTx = await pmid.mintIdentityToken(rando.address, uri, ['accreditation'])
    await accTx.wait()

    // these traits should be true
    expect(await pmid.hasUnexpiredTrait(rando.address, 'kyc_clear')).to.be.true
    expect(await pmid.hasUnexpiredTrait(rando.address, 'accreditation')).to.be.true

    // unexpected trait should be false
    expect(await pmid.hasUnexpiredTrait(rando.address, 'blurp')).to.be.false

    // the owner account has no token, so no traits, so this should be false
    expect(await pmid.hasUnexpiredTrait(owner.address, 'kyc_clear')).to.be.false

    // timetravel 91 days, when the tokens should now be expired
    await fastForward(86400 * 91)
    expect(await pmid.hasUnexpiredTrait(rando.address, 'kyc_clear')).to.be.false
    expect(await pmid.hasUnexpiredTrait(rando.address, 'accreditation')).to.be.false
  })
})
