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

    event TraitUpdated(uint256 indexed tokenId, string trait, bool value);
    
    mapping(uint256 => mapping(bytes32 => bool)) private _traits;
    mapping(uint256 => uint) private _mintedAts;

    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721("ParallelMarketsID", "PMID") {}

    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override {
        revert("ID Tokens cannot be transferred.");
    }

    function transferFrom(address, address, uint256) public virtual override {
        revert("ID Tokens cannot be transferred.");
    }

    function approve(address, uint256) public virtual override {
        revert("ID Tokens cannot be transferred.");
    }

    function getApproved(uint256) public view virtual override returns (address) {
        revert("ID Tokens cannot be transferred.");
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert("ID Tokens cannot be transferred.");
    }
    
    function mintIdentity(address recipient, string memory tokenDataURI, string[] memory traits) public virtual onlyOwner returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenDataURI);        
        _mintedAts[newItemId] = block.timestamp;

        for (uint i = 0; i < traits.length; i++) {
            setTrait(newItemId, traits[i], true);
        }

        return newItemId;
    }

    function unexpired(uint256 tokenId) public view virtual returns (bool) {
        return mintedAt(tokenId) >= block.timestamp - 90 days;
    }

    function mintedAt(uint256 tokenId) public view virtual returns (uint) {
        require(_exists(tokenId), "Request for nonexistent token");
        return _mintedAts[tokenId];
    }
    
    function setTrait(uint256 tokenId, string memory trait, bool value) public virtual onlyOwner {
        require(_exists(tokenId), "Request for nonexistent token");

        bytes32 traitHash = keccak256(abi.encode(trait));
        _traits[tokenId][traitHash] = value;

        emit TraitUpdated(tokenId, trait, value);
    }
    
    function getTrait(uint256 tokenId, string memory trait) public view virtual returns (bool) {
        require(_exists(tokenId), "Request for nonexistent token");

        bytes32 traitHash = keccak256(abi.encode(trait));
        return _traits[tokenId][traitHash];
    }

    function tokenURI(uint256 tokenId) public view virtual override (ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) public virtual onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete _mintedAts[tokenId];        
    }

    function burn(uint256 tokenId) public virtual {
        require(_exists(tokenId), "Cannot burn nonexistent token");
        
        // if the message sender is the token owner or the contract owner, allow burning        
        address tokenOwner = ERC721.ownerOf(tokenId);        
        require(_msgSender() == tokenOwner || _msgSender() == owner(), "Caller is not owner nor approved");
        
        _burn(tokenId);
    }
}
