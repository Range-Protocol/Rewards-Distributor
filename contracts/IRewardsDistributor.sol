//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IRewardsDistributor {
	function setMerkleRootForToken(IERC20 token, bytes32 merkleRoot) external;
	function claim(
		IERC20 token,
		address user,
		uint256 amount,
		bytes32[] memory merkleProof
	) external;
	function tokenList() external view returns (IERC20[] memory);
}
