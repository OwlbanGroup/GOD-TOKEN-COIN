const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumConsensus", function () {
  let quantumConsensus, addr1, addr2;

  beforeEach(async function () {
    [, addr1, addr2] = await ethers.getSigners();

    const QuantumConsensus = await ethers.getContractFactory("QuantumConsensus");
    quantumConsensus = await QuantumConsensus.deploy();
    await quantumConsensus.deployed();
  });

  describe("Deployment", function () {
    it("Should initialize genesis block", async function () {
      const [blockHash, quantumHash, , miner] = await quantumConsensus.getBlock(0);
      expect(blockHash).to.not.equal(ethers.constants.HashZero);
      expect(quantumHash).to.not.equal(ethers.constants.HashZero);
      expect(miner).to.equal(ethers.constants.AddressZero);
    });

    it("Should set quantum entropy", async function () {
      const entropy = await quantumConsensus.getQuantumEntropy();
      expect(entropy).to.not.equal(0);
    });
  });

  describe("Validator Management", function () {
    it("Should add validator with stake", async function () {
      const stake = ethers.utils.parseEther("100");

      await expect(quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: stake }))
        .to.emit(quantumConsensus, "ValidatorAdded")
        .withArgs(addr1.address, stake);

      expect(await quantumConsensus.getValidatorStake(addr1.address)).to.equal(stake);
      expect(await quantumConsensus.getValidatorReputation(addr1.address)).to.equal(1000);
    });

    it("Should reject adding validator without sufficient stake", async function () {
      const stake = ethers.utils.parseEther("100");
      const insufficientStake = ethers.utils.parseEther("50");

      await expect(quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: insufficientStake }))
        .to.be.revertedWith("Insufficient stake");
    });

    it("Should prevent adding same validator twice", async function () {
      const stake = ethers.utils.parseEther("100");

      await quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: stake });

      await expect(quantumConsensus.connect(addr1).addValidator(stake, 67890, { value: stake }))
        .to.be.revertedWith("Already a validator");
    });
  });

  describe("Quantum Block Mining", function () {
    beforeEach(async function () {
      // Add validator
      const stake = ethers.utils.parseEther("100");
      await quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: stake });
    });

    it("Should mine quantum block successfully", async function () {
      const quantumProof = ethers.utils.randomBytes(32);

      await expect(quantumConsensus.connect(addr1).mineQuantumBlock(quantumProof, 12345))
        .to.emit(quantumConsensus, "BlockMined");

      const [blockHash, quantumHash, , miner] = await quantumConsensus.getBlock(1);
      expect(miner).to.equal(addr1.address);
      expect(blockHash).to.not.equal(ethers.constants.HashZero);
      expect(quantumHash).to.not.equal(ethers.constants.HashZero);
    });

    it("Should reject mining from non-validator", async function () {
      const quantumProof = ethers.utils.randomBytes(32);

      await expect(quantumConsensus.connect(addr2).mineQuantumBlock(quantumProof, 12345))
        .to.be.revertedWith("Not an active validator");
    });

    it("Should update validator reputation after mining", async function () {
      const quantumProof = ethers.utils.randomBytes(32);
      await quantumConsensus.connect(addr1).mineQuantumBlock(quantumProof, 12345);

      expect(await quantumConsensus.getValidatorReputation(addr1.address)).to.equal(1010); // 1000 + 10
    });
  });

  describe("Hash Processing", function () {
    beforeEach(async function () {
      const stake = ethers.utils.parseEther("100");
      await quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: stake });
    });

    it("Should mark hash as processed", async function () {
      const testHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test hash"));

      expect(await quantumConsensus.isHashProcessed(testHash)).to.be.false;

      await quantumConsensus.connect(addr1).markHashProcessed(testHash);

      expect(await quantumConsensus.isHashProcessed(testHash)).to.be.true;
    });

    it("Should reject marking hash from non-validator", async function () {
      const testHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test hash"));

      await expect(quantumConsensus.connect(addr2).markHashProcessed(testHash))
        .to.be.revertedWith("Not a validator");
    });
  });

  describe("Quantum Difficulty", function () {
    it("Should maintain quantum difficulty", async function () {
      const difficulty = await quantumConsensus.QUANTUM_DIFFICULTY();
      expect(difficulty).to.equal(1000);
    });

    it("Should have reasonable block time target", async function () {
      const target = await quantumConsensus.BLOCK_TIME_TARGET();
      expect(target).to.equal(15); // 15 seconds
    });
  });

  describe("Quantum Entropy", function () {
    it("Should update quantum entropy after mining", async function () {
      const stake = ethers.utils.parseEther("100");
      await quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: stake });

      const entropyBefore = await quantumConsensus.getQuantumEntropy();

      const quantumProof = ethers.utils.randomBytes(32);
      await quantumConsensus.connect(addr1).mineQuantumBlock(quantumProof, 12345);

      const entropyAfter = await quantumConsensus.getQuantumEntropy();
      expect(entropyAfter).to.not.equal(entropyBefore);
    });
  });
});
