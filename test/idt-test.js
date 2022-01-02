const { expect } = require("chai");
const { ethers } = require("hardhat");

const deploy = async function () {
  const ParallelMarketsID = await ethers.getContractFactory("ParallelMarketsID")
  const pmid = await ParallelMarketsID.deploy()
  await pmid.deployed()
  return pmid
}

describe("ParallelMarketsID traits", function () {
  it("should be initialized correctly", async function () {
    const pmid = await deploy()
    
    // mint a token
    const [owner, rando] = await ethers.getSigners();
    const uri = "https://google.com"
    const mintTx = await pmid.mintIdentity(rando.address, uri, ["kyc_clear"])
    await mintTx.wait()

    // the owner should have nothing
    expect(await pmid.balanceOf(owner.address)).to.equal(0)
    
    const tokenId = await pmid.tokenOfOwnerByIndex(rando.address, 0)
    expect(await pmid.balanceOf(rando.address)).to.equal(1)
    expect(await pmid.getTrait(tokenId, "kyc_clear")).to.be.true
    expect(await pmid.getTrait(tokenId, "blurp")).to.be.false
    const now = Math.round((new Date()).getTime() / 1000)
    expect(await pmid.mintedAt(tokenId)).to.be.within(now - 1, now + 1)
    expect(await pmid.tokenURI(tokenId)).to.equal(uri)
    expect(await pmid.unexpired(tokenId)).to.be.true
  })

  it("should be settable", async function () {
    const pmid = await deploy()    

    const [owner, rando] = await ethers.getSigners();
    const uri = "https://google.com"
    const mintTx = await pmid.mintIdentity(rando.address, uri, ["kyc_clear"])
    await mintTx.wait()

    const tokenId = await pmid.tokenOfOwnerByIndex(rando.address, 0)    
    const updateTx = await pmid.setTrait(tokenId, "accreditation", true)
    await updateTx.wait()
    expect(await pmid.getTrait(tokenId, "accreditation")).to.be.true

    const updateTwoTx = await pmid.setTrait(tokenId, "accreditation", false)
    await updateTwoTx.wait()
    expect(await pmid.getTrait(tokenId, "accreditation")).to.be.false    
  })
});
