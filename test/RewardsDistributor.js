const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs')
const SHA256 = require('crypto-js/sha256')
const keccak256 = require('keccak256');

let rewardsDistributor;
let token;
let token1;
let token2;
let token3;
let owner;
let user1;
let user2;
let tree;
let root;
let leaves;
let tree1;
let root1;
let leaves1;
let tree2;
let root2;
let leaves2;
let tree3;
let root3;
let leaves3;

const parseEther = eth => ethers.utils.parseEther(eth);

describe('RewardsDistributor', () => {
	before(async () => {
		([owner, user1, user2] = await ethers.getSigners());
		const Token = await ethers.getContractFactory("MockERC20");
		[token, token1, token2, token3] = await Promise.all([
			Token.deploy(),
			Token.deploy(),
			Token.deploy(),
			Token.deploy()
		]);
		
		const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
		rewardsDistributor = await RewardsDistributor.deploy();
		
		leaves = await Promise.all([
			rewardsDistributor.getLeaf(token.address, user1.address, parseEther("40000")),
			rewardsDistributor.getLeaf(token.address, user2.address, parseEther("60000"))
		]);
		leaves1 = await Promise.all([
			rewardsDistributor.getLeaf(token1.address, user1.address, parseEther("40000")),
			rewardsDistributor.getLeaf(token1.address, user2.address, parseEther("60000"))
		]);
		leaves2 = await Promise.all([
			rewardsDistributor.getLeaf(token2.address, user1.address, parseEther("40000")),
			rewardsDistributor.getLeaf(token2.address, user2.address, parseEther("60000"))
		]);
		leaves3 = await Promise.all([
			rewardsDistributor.getLeaf(token3.address, user1.address, parseEther("40000")),
			rewardsDistributor.getLeaf(token3.address, user2.address, parseEther("60000"))
		]);
		
		tree = new MerkleTree(leaves, keccak256);
		tree1 = new MerkleTree(leaves1, keccak256);
		tree2 = new MerkleTree(leaves2, keccak256);
		tree3 = new MerkleTree(leaves3, keccak256);
		
		root = tree.getHexRoot();
		root1 = tree1.getHexRoot();
		root2 = tree2.getHexRoot();
		root3 = tree3.getHexRoot();
		
		await token.transfer(rewardsDistributor.address, parseEther("100000"));
		await token1.transfer(rewardsDistributor.address, parseEther("100000"));
		await token2.transfer(rewardsDistributor.address, parseEther("100000"));
		await token3.transfer(rewardsDistributor.address, parseEther("100000"));
	});

	it('non owner should not add merkle root', async () => {
		await expect(rewardsDistributor.connect(user2).setMerkleRootForToken(token.address, root))
			.to.be.revertedWithCustomError(rewardsDistributor,"OwnableUnauthorizedAccount")
			.withArgs(user2.address);
	});
	
	it('should add merkle root', async () => {
		await rewardsDistributor.setMerkleRootForToken(token.address, root);
		expect(await rewardsDistributor.merkleRootByToken(token.address))
			.to.be.equal(root);
		expect(await rewardsDistributor.tokenList()).to.deep.equal([token.address])
		await rewardsDistributor.setMerkleRootForToken(token.address, root);
		expect(await rewardsDistributor.tokenList()).to.deep.equal([token.address])
	});

	it('should claim reward for user1', async () => {
		expect(await token.balanceOf(user1.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token.address,
			user1.address,
			parseEther("40000"),
			tree.getHexProof(leaves[0])
		);
		expect(await token.balanceOf(user1.address)).to.be.equal(parseEther("40000"));
		expect(await token.balanceOf(rewardsDistributor.address)).to.be.equal(parseEther("60000"));
	});

	it('should claim reward for user2', async () => {
		expect(await token.balanceOf(user2.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token.address,
			user2.address,
			parseEther("60000"),
			tree.getHexProof(leaves[1])
		);
		expect(await token.balanceOf(user2.address)).to.be.equal(parseEther("60000"));
		expect(await token.balanceOf(rewardsDistributor.address)).to.be.equal(0);
	});
	
	it('should add merkle root', async () => {
		await rewardsDistributor.setMerkleRootForToken(token1.address, root1);
		expect(await rewardsDistributor.merkleRootByToken(token1.address))
			.to.be.equal(root1);

		expect(await rewardsDistributor.tokenList()).to.deep.equal([token.address, token1.address])
	});

	it('should claim reward for user1', async () => {
		expect(await token1.balanceOf(user1.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token1.address,
			user1.address,
			parseEther("40000"),
			tree1.getHexProof(leaves1[0])
		);
		expect(await token1.balanceOf(user1.address)).to.be.equal(parseEther("40000"));
		expect(await token1.balanceOf(rewardsDistributor.address)).to.be.equal(parseEther("60000"));
	});

	it('should claim reward for user2', async () => {
		expect(await token1.balanceOf(user2.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token1.address,
			user2.address,
			parseEther("60000"),
			tree1.getHexProof(leaves1[1])
		);
		expect(await token1.balanceOf(user2.address)).to.be.equal(parseEther("60000"));
		expect(await token1.balanceOf(rewardsDistributor.address)).to.be.equal(0);
	});

	it('should add merkle root', async () => {
		await rewardsDistributor.setMerkleRootForToken(token2.address, root2);
		expect(await rewardsDistributor.merkleRootByToken(token2.address))
			.to.be.equal(root2);
		expect(await rewardsDistributor.tokenList()).to.deep.equal([token.address, token1.address, token2.address]);
	});

	it('should claim reward for user1', async () => {
		expect(await token2.balanceOf(user1.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token2.address,
			user1.address,
			parseEther("40000"),
			tree2.getHexProof(leaves2[0])
		);
		expect(await token2.balanceOf(user1.address)).to.be.equal(parseEther("40000"));
		expect(await token2.balanceOf(rewardsDistributor.address)).to.be.equal(parseEther("60000"));
	});

	it('should claim reward for user2', async () => {
		expect(await token2.balanceOf(user2.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token2.address,
			user2.address,
			parseEther("60000"),
			tree2.getHexProof(leaves2[1])
		);
		expect(await token2.balanceOf(user2.address)).to.be.equal(parseEther("60000"));
		expect(await token2.balanceOf(rewardsDistributor.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token2.address,
			user2.address,
			parseEther("60000"),
			tree2.getHexProof(leaves2[1])
		);
		expect(await token2.balanceOf(user2.address)).to.be.equal(parseEther("60000"));
		expect(await token2.balanceOf(rewardsDistributor.address)).to.be.equal(0);
	});
	
	it('should add merkle root', async () => {
		await rewardsDistributor.setMerkleRootForToken(token3.address, root3);
		expect(await rewardsDistributor.merkleRootByToken(token3.address))
			.to.be.equal(root3);
	});
	
	it('should claim reward for user1', async () => {
		expect(await token3.balanceOf(user1.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token3.address,
			user1.address,
			parseEther("40000"),
			tree3.getHexProof(leaves3[0])
		);
		expect(await token3.balanceOf(user1.address)).to.be.equal(parseEther("40000"));
		expect(await token3.balanceOf(rewardsDistributor.address)).to.be.equal(parseEther("60000"));
	});
	
	it('should claim reward for user2', async () => {
		expect(await token3.balanceOf(user2.address)).to.be.equal(0);
		await rewardsDistributor.claim(
			token3.address,
			user2.address,
			parseEther("60000"),
			tree3.getHexProof(leaves3[1])
		);
		expect(await token3.balanceOf(user2.address)).to.be.equal(parseEther("60000"));
		expect(await token3.balanceOf(rewardsDistributor.address)).to.be.equal(0);
	});
});
