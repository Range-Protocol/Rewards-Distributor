//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRewardsDistributor} from "./IRewardsDistributor.sol";


contract RewardsDistributor is IRewardsDistributor, Ownable {
    using SafeERC20 for IERC20;

    // list of tokens
    IERC20[] private _tokenList;

    // token address to id.
    mapping(IERC20 => uint256) public tokenToIdx;

    // merkle root by token
    mapping(IERC20 => bytes32) public merkleRootByToken;

    // users' claimed amount against a token.
    mapping(IERC20 => mapping(address => uint256)) public userClaimedAmountByToken;

    error InvalidProof();
    error InvalidToken();

    event MerkleRootSet(IERC20 token, bytes32 merkleRoot);
    event Claimed(address user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function setMerkleRootForToken(IERC20 token, bytes32 merkleRoot) external onlyOwner {
        if (
            _tokenList.length == 0
            || (
            tokenToIdx[token] == 0
            && _tokenList[0] != token
        )
        ) {
            tokenToIdx[token] = _tokenList.length;
            _tokenList.push(token);
        }
        merkleRootByToken[token] = merkleRoot;
        emit MerkleRootSet(token, merkleRoot);
    }

    function claim(
        address user,
        IERC20 token,
        uint256 amount,
        bytes32[] memory merkleProof
    ) external {
        if (
            token == IERC20(address(0x0))
            || (
            tokenToIdx[token] == 0
            && _tokenList[0] != token
        )
        ) revert InvalidToken();
        bytes32 leaf = keccak256(
            abi.encodePacked(
                user,
                token,
                amount
            )
        );
        if (
            !MerkleProof.verify(
            merkleProof,
            merkleRootByToken[token],
            leaf
        )
        ) revert InvalidProof();

        uint256 toTransfer = amount - userClaimedAmountByToken[token][user];
        userClaimedAmountByToken[token][user] = amount;
        if (toTransfer != 0) {
            token.safeTransfer(user, toTransfer);
            emit Claimed(user, toTransfer);
        }
    }

    function tokenList() external view returns (IERC20[] memory) {
        return _tokenList;
    }
}
