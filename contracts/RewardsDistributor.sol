//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { MerkleProof } from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IRewardsDistributor } from './IRewardsDistributor.sol';

/**
 * @dev {RewardsDistributor} contract by Range to distribute other Fee.
 * The other fee from Range vault will be transferred to this contract, where the claimants will be able
 * to claim their fee using Merkle proof set against the token being claimed.
 * Inspired from Opensource Merkle distributor contract from Morpho:
 * https://github.com/morpho-org/morpho-optimizers/blob/main/src/common/rewards-distribution/RewardsDistributor.sol
 */
contract RewardsDistributor is IRewardsDistributor, Ownable {
    using SafeERC20 for IERC20;

    // list of tokens for which a Merkle root is set by the owner
    IERC20[] private _tokenList;

    // token address to index of the token in tokenList.
    mapping(IERC20 => uint256) public tokenToIdx;

    // latest merkle root by token
    mapping(IERC20 => bytes32) public merkleRootByToken;

    // users' claimed amount against a token.
    mapping(IERC20 => mapping(address => uint256))
        public userClaimedAmountByToken;

    error InvalidProof();
    error InvalidToken();

    event MerkleRootSet(IERC20 token, bytes32 merkleRoot);
    event Claimed(address user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Sets Merkle root for a token.
     * @param token address of the token to set Merkle root for.
     * @param merkleRoot merkle root against the provided token address.
     * requirements:
     * - only contract owner can call it.
     */
    function setMerkleRootForToken(
        IERC20 token,
        bytes32 merkleRoot
    ) external onlyOwner {
        if (
            _tokenList.length == 0 ||
            (tokenToIdx[token] == 0 && _tokenList[0] != token)
        ) {
            tokenToIdx[token] = _tokenList.length;
            _tokenList.push(token);
        }
        merkleRootByToken[token] = merkleRoot;
        emit MerkleRootSet(token, merkleRoot);
    }

    /**
     * @dev processes the user claim based on the provided merkle proof.
     * @param user address of the user to process claim.
     * @param token address of the token involved in the claim.
     * @param amount amount of the token involved in the claim.
     * @param merkleProof merkleProof against the claim.
     * requirements:
     * - token address must not be zero.
     * - token must have a merkle root set against it.
     * - the provided merkle proof must be valid.
     */
    function claim(
        IERC20 token,
        address user,
        uint256 amount,
        bytes32[] memory merkleProof
    ) external {
        if (
            token == IERC20(address(0x0)) ||
            (tokenToIdx[token] == 0 && _tokenList[0] != token)
        ) revert InvalidToken();
        bytes32 leaf = getLeaf(token, user, amount);
        if (!MerkleProof.verify(merkleProof, merkleRootByToken[token], leaf))
            revert InvalidProof();

        uint256 toTransfer = amount - userClaimedAmountByToken[token][user];
        userClaimedAmountByToken[token][user] = amount;
        if (toTransfer != 0) {
            token.safeTransfer(user, toTransfer);
            emit Claimed(user, toTransfer);
        }
    }

    /**
     * @dev returns the list of tokens for which the Merkle root exists in the contract.
     */
    function tokenList() external view returns (IERC20[] memory) {
        return _tokenList;
    }

    function getLeaf(
        IERC20 token,
        address user,
        uint256 amount
    ) public view returns (bytes32 leaf) {
        return keccak256(abi.encodePacked(token, user, amount));
    }
}
