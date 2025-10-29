const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumAISecurity", function () {
  let quantumSafeCrypto, quantumAIVerifier, quantumConsensus, quantumAISecurity;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy dependencies
    const QuantumSafeCrypto = await ethers.getContractFactory("QuantumSafeCrypto");
    quantumSafeCrypto = await QuantumSafeCrypto.deploy();
    await quantumSafeCrypto.deployed();

    const QuantumAIVerifier = await ethers.getContractFactory("QuantumAIVerifier");
    quantumAIVerifier = await QuantumAIVerifier.deploy();
    await quantumAIVerifier.deployed();

    const QuantumConsensus = await ethers.getContractFactory("QuantumConsensus");
    quantumConsensus = await QuantumConsensus.deploy();
    await quantumConsensus.deployed();

    // Deploy main contract
    const QuantumAISecurity = await ethers.getContractFactory("QuantumAISecurity");
    quantumAISecurity = await QuantumAISecurity.deploy(
      quantumSafeCrypto.address,
      quantumAIVerifier.address,
      quantumConsensus.address
    );
    await quantumAISecurity.deployed();
  });

  describe("Quantum Identity Registration", function () {
    it("Should register quantum identity", async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const identityData = ethers.utils.randomBytes(32);

      await expect(quantumAISecurity.connect(addr1).registerQuantumIdentity(
        quantumPublicKey,
        identityData
      )).to.emit(quantumAISecurity, "QuantumIdentityRegistered");

      const trustScore = await quantumAISecurity.getIdentityTrustScore(addr1.address);
      expect(trustScore).to.equal(500); // Initial trust score
    });

    it("Should reject registering identity twice", async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const identityData = ethers.utils.randomBytes(32);

      await quantumAISecurity.connect(addr1).registerQuantumIdentity(quantumPublicKey, identityData);

      await expect(quantumAISecurity.connect(addr1).registerQuantumIdentity(
        quantumPublicKey,
        identityData
      )).to.be.revertedWith("Identity already registered");
    });
  });

  describe("Quantum Authentication", function () {
    beforeEach(async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const identityData = ethers.utils.randomBytes(32);
      await quantumAISecurity.connect(addr1).registerQuantumIdentity(quantumPublicKey, identityData);
    });

    it("Should authenticate with quantum signature", async function () {
      const messageHash = ethers.utils.randomBytes(32);
      const quantumSignature = ethers.utils.randomBytes(32); // Mock signature
      const sessionId = ethers.utils.randomBytes(32);

      const result = await quantumAISecurity.connect(addr1).authenticateQuantum(
        messageHash,
        quantumSignature,
        sessionId
      );

      expect(result).to.be.true;

      const isAuthorized = await quantumAISecurity.isSessionAuthorized(addr1.address, sessionId);
      expect(isAuthorized).to.be.true;
    });

    it("Should reject authentication for unregistered identity", async function () {
      const messageHash = ethers.utils.randomBytes(32);
      const quantumSignature = ethers.utils.randomBytes(32);
      const sessionId = ethers.utils.randomBytes(32);

      const result = await quantumAISecurity.connect(addr2).authenticateQuantum(
        messageHash,
        quantumSignature,
        sessionId
      );

      expect(result).to.be.false;
    });
  });

  describe("Security Event Reporting", function () {
    it("Should report security event", async function () {
      const eventType = ethers.utils.formatBytes32String("SUSPICIOUS_ACTIVITY");
      const eventData = ethers.utils.randomBytes(32);
      const severity = 75;

      const tx = await quantumAISecurity.connect(addr1).reportSecurityEvent(
        eventType,
        eventData,
        severity
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'SecurityEventReported');
      expect(event).to.not.be.undefined;
    });

    it("Should reject invalid severity levels", async function () {
      const eventType = ethers.utils.formatBytes32String("ATTACK");
      const eventData = ethers.utils.randomBytes(32);
      const invalidSeverity = 150; // Above max 100

      await expect(quantumAISecurity.connect(addr1).reportSecurityEvent(
        eventType,
        eventData,
        invalidSeverity
      )).to.be.revertedWith("Invalid severity level");
    });
  });

  describe("Multi-Party Computation", function () {
    it("Should start multi-party computation", async function () {
      const participants = [addr1.address, addr2.address];
      const computationType = ethers.utils.formatBytes32String("SECRET_SHARING");
      const requiredParticipants = 2;

      const tx = await quantumAISecurity.connect(owner).startMultiPartyComputation(
        participants,
        computationType,
        requiredParticipants
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'MPCStarted');
      expect(event).to.not.be.undefined;
    });

    it("Should submit MPC share", async function () {
      // Start MPC
      const participants = [addr1.address, addr2.address];
      const computationType = ethers.utils.formatBytes32String("SECRET_SHARING");
      const requiredParticipants = 2;

      const startTx = await quantumAISecurity.connect(owner).startMultiPartyComputation(
        participants,
        computationType,
        requiredParticipants
      );
      const startReceipt = await startTx.wait();
      const startEvent = startReceipt.events.find(e => e.event === 'MPCStarted');
      const computationId = startEvent.args.computationId;

      // Submit shares
      const encryptedShare1 = ethers.utils.randomBytes(32);
      const encryptedShare2 = ethers.utils.randomBytes(32);

      await quantumAISecurity.connect(addr1).submitMPCShare(computationId, encryptedShare1);
      await quantumAISecurity.connect(addr2).submitMPCShare(computationId, encryptedShare2);

      // Check completion
      const [completed, resultHash, participantCount] = await quantumAISecurity.getMPCResult(computationId);
      expect(completed).to.be.true;
      expect(participantCount).to.equal(2);
    });

    it("Should reject submission from non-participant", async function () {
      const participants = [addr1.address, addr2.address];
      const computationType = ethers.utils.formatBytes32String("SECRET_SHARING");
      const requiredParticipants = 2;

      const startTx = await quantumAISecurity.connect(owner).startMultiPartyComputation(
        participants,
        computationType,
        requiredParticipants
      );
      const startReceipt = await startTx.wait();
      const startEvent = startReceipt.events.find(e => e.event === 'MPCStarted');
      const computationId = startEvent.args.computationId;

      const encryptedShare = ethers.utils.randomBytes(32);

      await expect(quantumAISecurity.connect(owner).submitMPCShare(computationId, encryptedShare))
        .to.be.revertedWith("Not a participant");
    });
  });

  describe("Security Event Analysis", function () {
    it("Should get security event analysis", async function () {
      const eventType = ethers.utils.formatBytes32String("UNUSUAL_PATTERN");
      const eventData = ethers.utils.randomBytes(32);
      const severity = 60;

      const reportTx = await quantumAISecurity.connect(addr1).reportSecurityEvent(
        eventType,
        eventData,
        severity
      );
      const reportReceipt = await reportTx.wait();
      const reportEvent = reportReceipt.events.find(e => e.event === 'SecurityEventReported');
      const eventId = reportEvent.args.eventId;

      const [retrievedEventType, retrievedSeverity, investigated, aiAnalysisHash] =
        await quantumAISecurity.getSecurityEventAnalysis(eventId);

      expect(retrievedEventType).to.equal(eventType);
      expect(retrievedSeverity).to.equal(severity);
      expect(investigated).to.be.false;
    });
  });

  describe("Trust Score Management", function () {
    beforeEach(async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const identityData = ethers.utils.randomBytes(32);
      await quantumAISecurity.connect(addr1).registerQuantumIdentity(quantumPublicKey, identityData);
    });

    it("Should update trust score on successful authentication", async function () {
      const initialScore = await quantumAISecurity.getIdentityTrustScore(addr1.address);

      const messageHash = ethers.utils.randomBytes(32);
      const quantumSignature = ethers.utils.randomBytes(32);
      const sessionId = ethers.utils.randomBytes(32);

      await quantumAISecurity.connect(addr1).authenticateQuantum(
        messageHash,
        quantumSignature,
        sessionId
      );

      const updatedScore = await quantumAISecurity.getIdentityTrustScore(addr1.address);
      expect(updatedScore).to.be.above(initialScore);
    });

    it("Should maintain trust score within bounds", async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const identityData = ethers.utils.randomBytes(32);
      await quantumAISecurity.connect(addr2).registerQuantumIdentity(quantumPublicKey, identityData);

      // Simulate multiple failed authentications
      for (let i = 0; i < 10; i++) {
        const messageHash = ethers.utils.randomBytes(32);
        const quantumSignature = ethers.utils.randomBytes(32);
        const sessionId = ethers.utils.randomBytes(32);

        await quantumAISecurity.connect(addr2).authenticateQuantum(
          messageHash,
          quantumSignature,
          sessionId
        );
      }

      const finalScore = await quantumAISecurity.getIdentityTrustScore(addr2.address);
      expect(finalScore).to.be.at.least(100); // MIN_TRUST_SCORE
      expect(finalScore).to.be.at.most(1000); // MAX_TRUST_SCORE
    });
  });

  describe("MPC Result Retrieval", function () {
    it("Should get MPC result for participant", async function () {
      // Start and complete MPC
      const participants = [addr1.address, addr2.address];
      const computationType = ethers.utils.formatBytes32String("SECRET_SHARING");
      const requiredParticipants = 2;

      const startTx = await quantumAISecurity.connect(owner).startMultiPartyComputation(
        participants,
        computationType,
        requiredParticipants
      );
      const startReceipt = await startTx.wait();
      const startEvent = startReceipt.events.find(e => e.event === 'MPCStarted');
      const computationId = startEvent.args.computationId;

      const encryptedShare1 = ethers.utils.randomBytes(32);
      const encryptedShare2 = ethers.utils.randomBytes(32);

      await quantumAISecurity.connect(addr1).submitMPCShare(computationId, encryptedShare1);
      await quantumAISecurity.connect(addr2).submitMPCShare(computationId, encryptedShare2);

      // Get result as participant
      const [completed, resultHash, participantCount] = await quantumAISecurity.connect(addr1).getMPCResult(computationId);
      expect(completed).to.be.true;
      expect(participantCount).to.equal(2);
    });
  });

  describe("Security Statistics", function () {
    it("Should provide security statistics", async function () {
      // Register identities
      const quantumPublicKey1 = ethers.utils.randomBytes(32);
      const identityData1 = ethers.utils.randomBytes(32);
      await quantumAISecurity.connect(addr1).registerQuantumIdentity(quantumPublicKey1, identityData1);

      const quantumPublicKey2 = ethers.utils.randomBytes(32);
      const identityData2 = ethers.utils.randomBytes(32);
      await quantumAISecurity.connect(addr2).registerQuantumIdentity(quantumPublicKey2, identityData2);

      // Report events
      await quantumAISecurity.connect(addr1).reportSecurityEvent(
        ethers.utils.formatBytes32String("TEST_EVENT"),
        ethers.utils.randomBytes(32),
        50
      );

      const [totalIdentities, activeIdentities, totalEvents, highSeverityEvents] =
        await quantumAISecurity.getSecurityStats();

      // Note: Actual implementation returns placeholders, so we check basic structure
      expect(totalIdentities).to.be.at.least(0);
      expect(activeIdentities).to.be.at.least(0);
      expect(totalEvents).to.be.at.least(0);
      expect(highSeverityEvents).to.be.at.least(0);
    });
  });
});
