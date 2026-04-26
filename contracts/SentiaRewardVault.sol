// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SentiaRewardVault {
    IERC20 public immutable wld;
    address public owner;

    mapping(bytes32 => bool) public paid;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Payout(bytes32 indexed earningIdHash, address indexed worker, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);

    error NotOwner();
    error AlreadyPaid();
    error InvalidToken();
    error InvalidOwner();
    error InvalidWorker();
    error InvalidAmount();
    error InvalidBatch();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address wldToken, address initialOwner) {
        if (wldToken == address(0)) revert InvalidToken();
        if (initialOwner == address(0)) revert InvalidOwner();

        wld = IERC20(wldToken);
        owner = initialOwner;

        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();

        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function payout(bytes32 earningIdHash, address worker, uint256 amount) external onlyOwner {
        _payout(earningIdHash, worker, amount);
    }

    function payoutBatch(
        bytes32[] calldata earningIdHashes,
        address[] calldata workers,
        uint256[] calldata amounts
    ) external onlyOwner {
        uint256 length = earningIdHashes.length;

        if (length == 0 || workers.length != length || amounts.length != length) {
            revert InvalidBatch();
        }

        for (uint256 i = 0; i < length; i++) {
            _payout(earningIdHashes[i], workers[i], amounts[i]);
        }
    }

    function balance() external view returns (uint256) {
        return wld.balanceOf(address(this));
    }

    function withdrawWld(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidWorker();
        if (amount == 0) revert InvalidAmount();

        bool ok = wld.transfer(to, amount);
        if (!ok) revert TransferFailed();

        emit Withdraw(to, amount);
    }

    function _payout(bytes32 earningIdHash, address worker, uint256 amount) internal {
        if (paid[earningIdHash]) revert AlreadyPaid();
        if (worker == address(0)) revert InvalidWorker();
        if (amount == 0) revert InvalidAmount();

        paid[earningIdHash] = true;

        bool ok = wld.transfer(worker, amount);
        if (!ok) revert TransferFailed();

        emit Payout(earningIdHash, worker, amount);
    }
}
