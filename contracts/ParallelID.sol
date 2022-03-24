// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./utils/OrderedStringSet.sol";

/*
 * @title The Parallel Identity Token (PID)
 * @author Parallel Markets Engineering Team
 */
contract ParallelID is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    // Emitted when a trait is added to token for the first time
    event TraitAdded(uint256 indexed tokenId, string trait);

    // Emitted when a trait is removed from a token
    event TraitRemoved(uint256 indexed tokenId, string trait);

    /*
     * @notice Emitted when there's a sanctions match in a monitored country
     * @param tokenId Numeric token id
     * @param countryId ISO 3316 numeric country code (see https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
     */
    event SanctionsMatch(uint256 indexed tokenId, uint256 countryId);

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    using OrderedStringSets for OrderedStringSets.OrderedStringSet;
    OrderedStringSets.OrderedStringSet private _traitsIndex;

    using BitMaps for BitMaps.BitMap;

    uint16 public constant SUBJECT_INDIVIDUAL = 0;
    uint16 public constant SUBJECT_BUSINESS = 1;

    struct Metadata {
        uint256 _mintedAt;
        uint256 _renewedAt;
        uint16 _subjectType;
        uint16 _citizenship;
        bool _anySanctions;
        BitMaps.BitMap _traits;
        BitMaps.BitMap _sanctions;
    }

    mapping(uint256 => Metadata) private _metas;

    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721("ParallelID", "PID") {}

    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override {
        revert("ID Tokens cannot be transferred.");
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public virtual override {
        revert("ID Tokens cannot be transferred");
    }

    function approve(address, uint256) public virtual override {
        revert("ID Tokens cannot be transferred");
    }

    function getApproved(uint256) public view virtual override returns (address) {
        revert("ID Tokens cannot be transferred");
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert("ID Tokens cannot be transferred");
    }

    function mint(
        address recipient,
        string memory tokenDataURI,
        string[] memory _traits,
        uint16 _subjectType,
        uint16 _citizenship
    ) external virtual onlyOwner returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenDataURI);

        Metadata storage meta = _metas[newItemId];
        meta._mintedAt = block.timestamp;
        meta._subjectType = _subjectType;
        meta._citizenship = _citizenship;

        for (uint256 i = 0; i < _traits.length; i++) {
            uint256 index = _traitsIndex.add(_traits[i]);
            meta._traits.set(index);
        }

        return newItemId;
    }

    function renew(
        uint256 tokenId,
        string memory tokenDataURI,
        string[] memory _traits,
        uint16 _citizenship
    ) external virtual onlyOwner exists(tokenId) {
        _setTokenURI(tokenId, tokenDataURI);
        Metadata storage meta = _metas[tokenId];
        meta._renewedAt = block.timestamp;
        meta._citizenship = _citizenship;

        // clear all traits
        for (uint256 i = 0; i < _traitsIndex.length(); i++) {
            if (meta._traits.get(i)) meta._traits.unset(i);
        }

        for (uint256 i = 0; i < _traits.length; i++) {
            uint256 index = _traitsIndex.add(_traits[i]);
            meta._traits.set(index);
        }
    }

    function lastIssuedAt(uint256 tokenId) public view virtual exists(tokenId) returns (uint256) {
        uint256 renewedAt = _metas[tokenId]._renewedAt;
        return renewedAt > 0 ? renewedAt : _metas[tokenId]._mintedAt;
    }

    function addSanctions(uint256 tokenId, uint256 countryId) external virtual onlyOwner exists(tokenId) {
        if (!_metas[tokenId]._sanctions.get(countryId)) {
            Metadata storage meta = _metas[tokenId];
            meta._sanctions.set(countryId);
            meta._anySanctions = true;
            emit SanctionsMatch(tokenId, countryId);
        }
    }

    function isSanctionsMonitored(uint256 tokenId) public view virtual exists(tokenId) returns (bool) {
        return lastIssuedAt(tokenId) >= block.timestamp - 365 days;
    }

    function isSanctionsSafe(uint256 tokenId) public view virtual exists(tokenId) returns (bool) {
        return (isSanctionsMonitored(tokenId) && !_metas[tokenId]._anySanctions);
    }

    /*
     * @notice Use this to determine if the token holder is (1) still monitored for sanctions and doesn't
     * have any known sanctions for the given country. For a list of monitored countries, see the Parallel
     * developer docs.
     *
     * @param tokenId Numeric token id
     * @param countryId ISO 3316 numeric country code (see https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
     */
    function isSanctionsSafeIn(uint256 tokenId, uint256 countryId) public view virtual exists(tokenId) returns (bool) {
        return (isSanctionsMonitored(tokenId) && !_metas[tokenId]._sanctions.get(countryId));
    }

    function citizenship(uint256 tokenId) public view virtual exists(tokenId) returns (uint16) {
        return _metas[tokenId]._citizenship;
    }

    function subjectType(uint256 tokenId) public view virtual exists(tokenId) returns (uint16) {
        return _metas[tokenId]._subjectType;
    }

    function mintedAt(uint256 tokenId) public view virtual returns (uint256) {
        require(_exists(tokenId), "Request for nonexistent token");
        return _metas[tokenId]._mintedAt;
    }

    function addTrait(uint256 tokenId, string memory trait) external virtual onlyOwner exists(tokenId) {
        Metadata storage meta = _metas[tokenId];
        uint256 index = _traitsIndex.add(trait);
        meta._traits.set(index);

        emit TraitAdded(tokenId, trait);
    }

    function removeTrait(uint256 tokenId, string memory trait) external virtual onlyOwner exists(tokenId) {
        Metadata storage meta = _metas[tokenId];
        (bool found, uint256 index) = _traitsIndex.indexOf(trait);

        // if the trait has been seen before and is set
        if (found && meta._traits.get(index)) {
            meta._traits.unset(index);
            emit TraitRemoved(tokenId, trait);
        }
    }

    function hasTrait(uint256 tokenId, string memory trait) public view virtual exists(tokenId) returns (bool) {
        (bool found, uint256 index) = _traitsIndex.indexOf(trait);
        return found ? _metas[tokenId]._traits.get(index) : false;
    }

    // @dev This may be very expensive, especially if the total number of available traits
    // gets large.
    function traits(uint256 tokenId) public view virtual exists(tokenId) returns (string[] memory) {
        // The following logic is nice and fun, but is necessary so we always allocate a set
        // amount of memory necessary at each stage.

        // this will be the token traits bitmap
        BitMaps.BitMap storage tokenTraits = _metas[tokenId]._traits;

        // this makes a variable to hold a list of all indexes in the _traitsIndex that
        // are set in the tokenTraits bitmap.  We initialize it to be the size of the whole
        // _traitsIndex in case every single trait we've ever known about is true. Then,
        // we keep running track of the length of the indexes, so we know how much of the
        // allocated space is used.
        uint256[] memory indexes = new uint256[](_traitsIndex.length());
        uint256 indexLength = 0;

        // For all possible traits, see if the trait is set in the token, and if so, add
        // the index of the trait to our list of indexes.
        for (uint256 i = 0; i < _traitsIndex.length(); i++) {
            if (tokenTraits.get(i)) {
                indexes[indexLength] = i;
                indexLength += 1;
            }
        }

        // now make a result that's exactly as big as it needs to be,
        // and fill it w/ the actual strings from our _traitsIndex
        string[] memory result = new string[](indexLength);
        for (uint256 i = 0; i < indexLength; i++) {
            result[i] = _traitsIndex.at(indexes[i]);
        }

        return result;
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) external virtual onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete _metas[tokenId];
    }

    function burn(uint256 tokenId) public virtual exists(tokenId) {
        // if the message sender is the token owner or the contract owner, allow burning
        address tokenOwner = ERC721.ownerOf(tokenId);
        require(_msgSender() == tokenOwner || _msgSender() == owner(), "Caller is not owner nor approved");

        _burn(tokenId);
    }

    modifier exists(uint256 tokenId) {
        require(_exists(tokenId), "Request for nonexistent token");
        _;
    }
}
