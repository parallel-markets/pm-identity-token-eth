// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// import "hardhat/console.sol";

contract ParallelMarketsID is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    mapping(uint256 => mapping(bytes32 => bool)) private _traits;
    mapping(uint256 => uint) private _expirations;
    
    constructor() ERC721("ParallelMarketsID", "PMID") {}

    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override {
        revert("Identity tokens cannot be transferred.");
    }

    function transferFrom(address, address, uint256) public virtual override {
        revert("Identity tokens cannot be transferred.");
    }

    function approve(address, uint256) public virtual override {
        revert("Identity tokens cannot be transferred.");
    }

    function getApproved(uint256) public view virtual override returns (address) {
        revert("Identity tokens cannot be transferred.");
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert("Identity tokens cannot be transferred.");
    }
    
    function mintIdentity(address recipient, string memory tokenDataURI, uint expiration, string[] memory traits) public virtual onlyOwner returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenDataURI);        
        _expirations[newItemId] = expiration;

        for (uint i = 0; i < traits.length; i++) {
            setTrait(newItemId, traits[i], true);
        }

        return newItemId;
    }

    function _unexpired(uint256 tokenId) internal view virtual returns (bool) {
        return _exists(tokenId) && _expirations[tokenId] > block.timestamp;
    }

    function expires(uint256 tokenId) public view virtual returns (uint) {
        require(_exists(tokenId), "Token does not exist");
        return _expirations[tokenId];
    }
    
    function setTrait(uint256 tokenId, string memory trait, bool value) public virtual onlyOwner {
        require(_unexpired(tokenId), "Trait request for expired token");

        bytes32 traitHash = keccak256(abi.encode(trait));
        _traits[tokenId][traitHash] = value;
    }
    
    function getTrait(uint256 tokenId, string memory trait) public view virtual returns (bool) {
        require(_unexpired(tokenId), "Trait request for expired token");

        bytes32 traitHash = keccak256(abi.encode(trait));
        return _traits[tokenId][traitHash];
    }

    function tokenURI(uint256 tokenId) public view virtual override (ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete _expirations[tokenId];        
    }

    function burn(uint256 tokenId) public virtual {
        require(_exists(tokenId), "ERC721: operator query for nonexistent token");
        address tokenOwner = ERC721.ownerOf(tokenId);
        // if the message sender is the token owner or the contract owner, allow burning
        require(_msgSender() == tokenOwner || _msgSender() == owner(), "ERC721Burnable: caller is not owner nor approved");
        _burn(tokenId);
    }
}
