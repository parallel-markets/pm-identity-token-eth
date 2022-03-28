// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../utils/OrderedStringSet.sol";

contract OrderedStringSetsMock {
    event OperationResult(uint256 result);

    using OrderedStringSets for OrderedStringSets.OrderedStringSet;

    OrderedStringSets.OrderedStringSet private _set;

    function add(string memory value) public {
        uint256 result = _set.add(value);
        emit OperationResult(result);
    }

    function indexOf(string memory value) public view returns (bool, uint256) {
        return _set.indexOf(value);
    }

    function contains(string memory value) public view returns (bool) {
        return _set.contains(value);
    }

    function length() public view returns (uint256) {
        return _set.length();
    }

    function at(uint256 index) public view returns (string memory) {
        return _set.at(index);
    }

    function values() public view returns (string[] memory) {
        return _set.values();
    }
}
