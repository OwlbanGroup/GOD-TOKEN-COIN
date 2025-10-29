const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumAIVerifier", function () {
  let quantumAIVerifier, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const QuantumAIVerifier = await ethers.getContractFactory("QuantumAIVerifier");
    quantumAIVerifier = await QuantumAIVerifier.deploy();
    await quantumAIVerifier.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await quantumAIVerifier.owner()).to.equal(owner.address);
    });

    it("Should authorize owner as verifier", async function () {
      expect(await quantumAIVerifier.authorizedVerifiers(owner.address)).to.be.true;
    });

    it("Should initialize quantum entropy", async function () {
      const entropy = await quantumAIVerifier.getQuantumEntropy();
      expect(entropy).to.not.equal(0);
    });
  });

  describe("Quantum AI Verification Request", function () {
    it("Should request quantum AI verification", async function () {
      const metalType = 1; // Gold
      const weight = 100; // 100 grams
      const purity = 999; // 99.9%
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const fee = ethers.utils.parseEther("0.01");

      await expect(quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, purity, sensorDataHash, { value: fee }
      )).to.emit(quantumAIVerifier, "VerificationRequested");

      expect(await quantumAIVerifier.nextRequestId()).to.equal(1);
    });

    it("Should reject invalid metal type", async function () {
      const invalidMetalType = 3; // Invalid
      const weight = 100;
      const purity = 999;
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const fee = ethers.utils.parseEther("0.01");

      await expect(quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        invalidMetalType, weight, purity, sensorDataHash, { value: fee }
      )).to.be.revertedWith("Invalid metal type");
    });

    it("Should reject insufficient fee", async function () {
      const metalType = 1;
      const weight = 100;
      const purity = 999;
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const insufficientFee = ethers.utils.parseEther("0.005");

      await expect(quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, purity, sensorDataHash, { value: insufficientFee }
      )).to.be.revertedWith("Insufficient verification fee");
    });

    it("Should reject invalid purity", async function () {
      const metalType = 1;
      const weight = 100;
      const invalidPurity = 800; // Too low
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const fee = ethers.utils.parseEther("0.01");

      await expect(quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, invalidPurity, sensorDataHash, { value: fee }
      )).to.be.revertedWith("Invalid purity");
    });
  });

  describe("Quantum AI Verification Submission", function () {
    let requestId;

    beforeEach(async function () {
      const metalType = 1;
      const weight = 100;
      const purity = 999;
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const fee = ethers.utils.parseEther("0.01");

      const tx = await quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, purity, sensorDataHash, { value: fee }
      );
      const receipt = await tx.wait();
      requestId = receipt.events[0].args.requestId;
    });

    it("Should submit and complete quantum AI verification", async function () {
      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("quantum-analysis-data");

      await expect(quantumAIVerifier.submitQuantumAIVerification(
        requestId, true, aiConfidence, quantumAnalysis
      )).to.emit(quantumAIVerifier, "VerificationCompleted");

      const [verified, aiConf, quantumConf, verificationId] = await quantumAIVerifier.getVerificationResult(requestId);
      expect(verified).to.be.true;
      expect(aiConf).to.equal(180); // Boosted by quantum factor (90 * 2)
      expect(quantumConf).to.be.gte(0).and.lte(100);
      expect(verificationId).to.not.equal(ethers.constants.HashZero);
    });

    it("Should apply quantum boost when quantum confidence is high", async function () {
      const aiConfidence = 80;
      const highQuantumAnalysis = ethers.utils.toUtf8Bytes("high-confidence-quantum-analysis");

      await quantumAIVerifier.submitQuantumAIVerification(
        requestId, true, aiConfidence, highQuantumAnalysis
      );

      const [verified, aiConf, quantumConf] = await quantumAIVerifier.getVerificationResult(requestId);
      expect(aiConf).to.equal(160); // 80 * 2 (quantum boost)
    });

    it("Should reject submission from unauthorized verifier", async function () {
      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("quantum-analysis-data");

      await expect(quantumAIVerifier.connect(addr2).submitQuantumAIVerification(
        requestId, true, aiConfidence, quantumAnalysis
      )).to.be.revertedWith("Not authorized verifier");
    });

    it("Should reject submission for non-existent request", async function () {
      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("quantum-analysis-data");

      await expect(quantumAIVerifier.submitQuantumAIVerification(
        999, true, aiConfidence, quantumAnalysis
      )).to.be.revertedWith("Request not found");
    });

    it("Should reject duplicate verification submission", async function () {
      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("quantum-analysis-data");

      await quantumAIVerifier.submitQuantumAIVerification(
        requestId, true, aiConfidence, quantumAnalysis
      );

      await expect(quantumAIVerifier.submitQuantumAIVerification(
        requestId, true, aiConfidence, quantumAnalysis
      )).to.be.revertedWith("Already verified");
    });
  });

  describe("Quantum Signature Verification", function () {
    let requestId, verificationId;

    beforeEach(async function () {
      const metalType = 1;
      const weight = 100;
      const purity = 999;
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const fee = ethers.utils.parseEther("0.01");

      const tx = await quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, purity, sensorDataHash, { value: fee }
      );
      const receipt = await tx.wait();
      requestId = receipt.events[0].args.requestId;

      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("quantum-analysis-data");
      await quantumAIVerifier.submitQuantumAIVerification(
        requestId, true, aiConfidence, quantumAnalysis
      );

      [, , , verificationId] = await quantumAIVerifier.getVerificationResult(requestId);
    });

    it("Should verify quantum signature", async function () {
      const message = ethers.utils.toUtf8Bytes("test message");
      const signature = ethers.utils.randomBytes(64);
      const commitment = [ethers.BigNumber.from(1), ethers.BigNumber.from(2), ethers.BigNumber.from(3), ethers.BigNumber.from(4)];

      await expect(quantumAIVerifier.verifyQuantumSignature(requestId, message, signature, commitment))
        .to.emit(quantumAIVerifier, "QuantumSignatureVerified");
    });

    it("Should reject signature verification for non-existent request", async function () {
      const message = ethers.utils.toUtf8Bytes("test message");
      const signature = ethers.utils.randomBytes(64);
      const commitment = [ethers.BigNumber.from(1), ethers.BigNumber.from(2), ethers.BigNumber.from(3), ethers.BigNumber.from(4)];

      await expect(quantumAIVerifier.verifyQuantumSignature(999, message, signature, commitment))
        .to.be.revertedWith("Request not found");
    });
  });

  describe("Verifier Management", function () {
    it("Should authorize new verifier", async function () {
      await quantumAIVerifier.authorizeVerifier(addr1.address);
      expect(await quantumAIVerifier.authorizedVerifiers(addr1.address)).to.be.true;
    });

    it("Should revoke verifier authorization", async function () {
      await quantumAIVerifier.authorizeVerifier(addr1.address);
      expect(await quantumAIVerifier.authorizedVerifiers(addr1.address)).to.be.true;

      await quantumAIVerifier.revokeVerifier(addr1.address);
      expect(await quantumAIVerifier.authorizedVerifiers(addr1.address)).to.be.false;
    });

    it("Should reject authorization from non-owner", async function () {
      await expect(quantumAIVerifier.connect(addr1).authorizeVerifier(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Verification Validation", function () {
    it("Should check if verification ID is valid", async function () {
      const metalType = 1;
      const weight = 100;
      const purity = 999;
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));
      const fee = ethers.utils.parseEther("0.01");

      const tx = await quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, purity, sensorDataHash, { value: fee }
      );
      const receipt = await tx.wait();
      const requestId = receipt.events[0].args.requestId;

      const aiConfidence = 90;
      const quantumAnalysis = ethers.utils.toUtf8Bytes("quantum-analysis-data");
      await quantumAIVerifier.submitQuantumAIVerification(
        requestId, true, aiConfidence, quantumAnalysis
      );

      const [, , , verificationId] = await quantumAIVerifier.getVerificationResult(requestId);
      expect(await quantumAIVerifier.isVerificationValid(verificationId)).to.be.true;

      const invalidId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("invalid"));
      expect(await quantumAIVerifier.isVerificationValid(invalidId)).to.be.false;
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to withdraw fees", async function () {
      const fee = ethers.utils.parseEther("0.01");
      const metalType = 1;
      const weight = 100;
      const purity = 999;
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));

      await quantumAIVerifier.connect(addr1).requestQuantumAIVerification(
        metalType, weight, purity, sensorDataHash, { value: fee }
      );

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await quantumAIVerifier.withdrawFees();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should reject fee withdrawal from non-owner", async function () {
      await expect(quantumAIVerifier.connect(addr1).withdrawFees())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
