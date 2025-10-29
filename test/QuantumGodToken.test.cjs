const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumGodToken", function () {
  let quantumGodToken, aiVerifier, quantumConsensus, quantumAIVerifier, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy dependencies
    const AIVerifier = await ethers.getContractFactory("AIVerifier");
    aiVerifier = await AIVerifier.deploy();
    await aiVerifier.deployed();

    const QuantumConsensus = await ethers.getContractFactory("QuantumConsensus");
    quantumConsensus = await QuantumConsensus.deploy();
    await quantumConsensus.deployed();

    const QuantumAIVerifier = await ethers.getContractFactory("QuantumAIVerifier");
    quantumAIVerifier = await QuantumAIVerifier.deploy();
    await quantumAIVerifier.deployed();

    // Deploy QuantumGodToken
    const QuantumGodToken = await ethers.getContractFactory("QuantumGodToken");
    quantumGodToken = await QuantumGodToken.deploy(
      aiVerifier.address,
      quantumConsensus.address,
      quantumAIVerifier.address
    );
    await quantumGodToken.deployed();

    // Authorize verifiers
    await aiVerifier.authorizeVerifier(owner.address);
    await quantumAIVerifier.authorizeVerifier(owner.address);

    // Add validator to quantum consensus
    const stake = ethers.utils.parseEther("100");
    await quantumConsensus.connect(addr1).addValidator(stake, 12345, { value: stake });
  });

  describe("Deployment", function () {
    it("Should set the right contracts", async function () {
      expect(await quantumGodToken.aiVerifier()).to.equal(aiVerifier.address);
      expect(await quantumGodToken.quantumConsensus()).to.equal(quantumConsensus.address);
      expect(await quantumGodToken.quantumAIVerifier()).to.equal(quantumAIVerifier.address);
    });

    it("Should inherit GodToken functionality", async function () {
      expect(await quantumGodToken.owner()).to.equal(owner.address);
      expect(await quantumGodToken.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
    });
  });

  describe("Quantum Transfer", function () {
    beforeEach(async function () {
      // Mint some tokens to addr1
      const amount = ethers.utils.parseEther("1000");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));

      const requestId = await aiVerifier.requestVerification(1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") });
      await aiVerifier.submitVerification(requestId, true, requestId);

      await quantumGodToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));
      await quantumGodToken.mintWithVerification(addr1.address, amount, requestId);
    });

    it("Should execute quantum transfer", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      const quantumProof = ethers.utils.randomBytes(32);

      const balanceBefore = await quantumGodToken.balanceOf(addr2.address);

      await expect(quantumGodToken.connect(addr1).quantumTransfer(addr2.address, transferAmount, quantumProof))
        .to.emit(quantumGodToken, "QuantumTransactionExecuted");

      const balanceAfter = await quantumGodToken.balanceOf(addr2.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(transferAmount);

      // Check quantum transaction record
      const [from, to, amount, quantumHash, timestamp, verified] = await quantumGodToken.getQuantumTransaction(0);
      expect(from).to.equal(addr1.address);
      expect(to).to.equal(addr2.address);
      expect(amount).to.equal(transferAmount);
      expect(verified).to.be.true;
    });

    it("Should reject quantum transfer with insufficient balance", async function () {
      const transferAmount = ethers.utils.parseEther("2000"); // More than balance
      const quantumProof = ethers.utils.randomBytes(32);

      await expect(quantumGodToken.connect(addr1).quantumTransfer(addr2.address, transferAmount, quantumProof))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should validate quantum hash", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      const quantumProof = ethers.utils.randomBytes(32);

      await quantumGodToken.connect(addr1).quantumTransfer(addr2.address, transferAmount, quantumProof);

      const [, , , quantumHash] = await quantumGodToken.getQuantumTransaction(0);
      expect(await quantumGodToken.isQuantumHashValid(quantumHash)).to.be.true;
    });
  });

  describe("Quantum Minting", function () {
    it("Should quantum mint with verification", async function () {
      const mintAmount = ethers.utils.parseEther("500");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("quantum-sensor-data"));

      // Request quantum AI verification
      const quantumRequestId = await quantumAIVerifier.requestQuantumAIVerification(
        1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") }
      );

      // Submit quantum verification
      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("high-confidence-quantum-analysis");
      await quantumAIVerifier.submitQuantumAIVerification(
        quantumRequestId, true, aiConfidence, quantumAnalysis
      );

      // Update reserves
      await quantumGodToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));

      // Quantum mint
      const quantumProof = ethers.utils.randomBytes(32);
      await expect(quantumGodToken.quantumMintWithVerification(
        addr1.address, mintAmount, quantumRequestId, quantumProof
      )).to.emit(quantumGodToken, "TokensMinted");

      expect(await quantumGodToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should reject quantum minting with insufficient quantum confidence", async function () {
      const mintAmount = ethers.utils.parseEther("500");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("low-confidence-sensor"));

      const quantumRequestId = await quantumAIVerifier.requestQuantumAIVerification(
        1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") }
      );

      // Submit with low confidence
      const lowAIConfidence = 70;
      const lowQuantumAnalysis = ethers.utils.toUtf8Bytes("low-confidence-analysis");
      await quantumAIVerifier.submitQuantumAIVerification(
        quantumRequestId, true, lowAIConfidence, lowQuantumAnalysis
      );

      await quantumGodToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));
      const quantumProof = ethers.utils.randomBytes(32);

      await expect(quantumGodToken.quantumMintWithVerification(
        addr1.address, mintAmount, quantumRequestId, quantumProof
      )).to.be.revertedWith("Quantum confidence too low");
    });
  });

  describe("Quantum Burning", function () {
    beforeEach(async function () {
      // Mint tokens first
      const amount = ethers.utils.parseEther("1000");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));

      const requestId = await aiVerifier.requestVerification(1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") });
      await aiVerifier.submitVerification(requestId, true, requestId);

      await quantumGodToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));
      await quantumGodToken.mintWithVerification(addr1.address, amount, requestId);
    });

    it("Should quantum burn tokens", async function () {
      const burnAmount = ethers.utils.parseEther("200");
      const quantumProof = ethers.utils.randomBytes(32);

      const balanceBefore = await quantumGodToken.balanceOf(addr1.address);
      const supplyBefore = await quantumGodToken.totalSupply();

      await expect(quantumGodToken.connect(addr1).quantumBurn(burnAmount, quantumProof))
        .to.emit(quantumGodToken, "TokensBurned");

      const balanceAfter = await quantumGodToken.balanceOf(addr1.address);
      const supplyAfter = await quantumGodToken.totalSupply();

      expect(balanceBefore.sub(balanceAfter)).to.equal(burnAmount);
      expect(supplyBefore.sub(supplyAfter)).to.equal(burnAmount);
    });

    it("Should reject quantum burn with insufficient balance", async function () {
      const burnAmount = ethers.utils.parseEther("2000"); // More than balance
      const quantumProof = ethers.utils.randomBytes(32);

      await expect(quantumGodToken.connect(addr1).quantumBurn(burnAmount, quantumProof))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Quantum Transaction Tracking", function () {
    it("Should track quantum transactions", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      const quantumProof = ethers.utils.randomBytes(32);

      await quantumGodToken.connect(addr1).quantumTransfer(addr2.address, transferAmount, quantumProof);

      expect(await quantumGodToken.getTotalQuantumTransactions()).to.equal(1);

      const [from, to, amount, quantumHash, timestamp, verified] = await quantumGodToken.getQuantumTransaction(0);
      expect(from).to.equal(addr1.address);
      expect(to).to.equal(addr2.address);
      expect(amount).to.equal(transferAmount);
      expect(verified).to.be.true;
      expect(timestamp).to.be.gt(0);
      expect(quantumHash).to.not.equal(ethers.constants.HashZero);
    });
  });

  describe("Regular Transfer Compatibility", function () {
    it("Should still allow regular transfers", async function () {
      // Mint tokens first
      const amount = ethers.utils.parseEther("1000");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));

      const requestId = await aiVerifier.requestVerification(1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") });
      await aiVerifier.submitVerification(requestId, true, requestId);

      await quantumGodToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));
      await quantumGodToken.mintWithVerification(addr1.address, amount, requestId);

      // Regular transfer should still work
      const transferAmount = ethers.utils.parseEther("100");
      await quantumGodToken.connect(addr1).transfer(addr2.address, transferAmount);

      expect(await quantumGodToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });
  });
});
