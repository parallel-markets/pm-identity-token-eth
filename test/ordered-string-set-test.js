const { expect } = require('chai')
const { ethers } = require('hardhat')

const { deploy } = require('./utils')

describe('An OrderedStringSet', () => {
  beforeEach(async () => {
    this.set = await deploy('OrderedStringSetsMock')
  })

  it('should add new/existing items correctly', async () => {
    expect(await this.set.length()).to.equal(0)
    expect(await this.set.contains('hi')).to.be.false
    expect(await this.set.indexOf('not there')).to.eql([false, ethers.BigNumber.from(0)])

    await expect(this.set.add('one')).to.emit(this.set, 'OperationResult').withArgs(0)
    expect(await this.set.length()).to.equal(1)
    expect(await this.set.contains('one')).to.be.true

    await expect(this.set.add('two')).to.emit(this.set, 'OperationResult').withArgs(1)
    expect(await this.set.length()).to.equal(2)

    // existing string should have same index
    await expect(this.set.add('one')).to.emit(this.set, 'OperationResult').withArgs(0)

    expect(await this.set.indexOf('one')).to.eql([true, ethers.BigNumber.from(0)])
    expect(await this.set.at(0)).to.equal('one')

    expect(await this.set.indexOf('two')).to.eql([true, ethers.BigNumber.from(1)])
    expect(await this.set.at(1)).to.equal('two')
  })

  it('should return all set values', async () => {
    await this.set.add('one')
    await this.set.add('two')
    await this.set.add('one')
    await this.set.add('two')
    await this.set.add('three')

    expect(await this.set.values()).to.eql(['one', 'two', 'three'])
  })
})
