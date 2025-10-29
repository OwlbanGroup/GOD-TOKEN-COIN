const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumAINetwork", function () {
  let quantumSafeCrypto, quantumConsensus, quantumAIVerifier, quantumGodToken, quantumAINetwork;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy dependencies
    const QuantumSafeCrypto = await ethers.getContractFactory("QuantumSafeCrypto");
    quantumSafeCrypto = await QuantumSafeCrypto.deploy();
    await quantumSafeCrypto.deployed();

    const QuantumConsensus = await ethers.getContractFactory("QuantumConsensus");
    quantumConsensus = await QuantumConsensus.deploy();
    await quantumConsensus.deployed();

    const QuantumAIVerifier = await ethers.getContractFactory("QuantumAIVerifier");
    quantumAIVerifier = await QuantumAIVerifier.deploy();
    await quantumAIVerifier.deployed();

    const QuantumGodToken = await ethers.getContractFactory("QuantumGodToken");
    quantumGodToken = await QuantumGodToken.deploy(
      addr1.address, // mock AI verifier
      quantumConsensus.address,
      quantumAIVerifier.address
    );
    await quantumGodToken.deployed();

    // Deploy main contract
    const QuantumAINetwork = await ethers.getContractFactory("QuantumAINetwork");
    quantumAINetwork = await QuantumAINetwork.deploy(
      quantumSafeCrypto.address,
      quantumConsensus.address,
      quantumAIVerifier.address,
      quantumGodToken.address
    );
    await quantumAINetwork.deployed();

    // Mint tokens for testing
    await quantumGodToken.mint(addr1.address, ethers.utils.parseEther("10000"));
    await quantumGodToken.mint(addr2.address, ethers.utils.parseEther("10000"));
  });

  describe("Node Registration", function () {
    it("Should register a quantum node", async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const supportedModels = [ethers.utils.randomBytes(32), ethers.utils.randomBytes(32)];

      await quantumGodToken.connect(addr1).approve(quantumAINetwork.address, ethers.utils.parseEther("1000"));

      await expect(quantumAINetwork.connect(addr1).registerNode(quantumPublicKey, supportedModels))
        .to.emit(quantumAINetwork, "NodeRegistered");

      const node = await quantumAINetwork.nodes(addr1.address);
      expect(node.isActive).to.be.true;
      expect(node.stakeAmount).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should reject registering same node twice", async function () {
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const supportedModels = [ethers.utils.randomBytes(32)];

      await quantumGodToken.connect(addr1).approve(quantumAINetwork.address, ethers.utils.parseEther("2000"));

      await quantumAINetwork.connect(addr1).registerNode(quantumPublicKey, supportedModels);

      await expect(quantumAINetwork.connect(addr1).registerNode(quantumPublicKey, supportedModels))
        .to.be.revertedWith("Node already registered");
    });
  });

  describe("AI Model Registration", function () {
    it("Should register an AI model", async function () {
      const modelHash = ethers.utils.randomBytes(32);
      const quantumSignature = ethers.utils.randomBytes(32);

      await expect(quantumAINetwork.connect(addr1).registerAIModel(modelHash, quantumSignature))
        .to.emit(quantumAINetwork, "AIModelRegistered");

      const model = await quantumAINetwork.aiModels(modelHash);
      expect(model.creator).to.equal(addr1.address);
      expect(model.isVerified).to.be.false;
    });
  });

  describe("Computation Requests", function () {
    beforeEach(async function () {
      // Register a node
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const supportedModels = [ethers.utils.randomBytes(32)];
      await quantumGodToken.connect(addr1).approve(quantumAINetwork.address, ethers.utils.parseEther("1000"));
      await quantumAINetwork.connect(addr1).registerNode(quantumPublicKey, supportedModels);

      // Register a model
      const modelHash = supportedModels[0];
      const quantumSignature = ethers.utils.randomBytes(32);
      await quantumAINetwork.connect(addr2).registerAIModel(modelHash, quantumSignature);
    });

    it("Should create computation request", async function () {
      const modelHash = ethers.utils.randomBytes(32);
      const inputDataHash = ethers.utils.randomBytes(32);
      const reward = ethers.utils.parseEther("100");

      await quantumGodToken.connect(addr2).approve(quantumAINetwork.address, reward);

      const tx = await quantumAINetwork.connect(addr2).requestComputation(
        modelHash,
        inputDataHash,
        reward
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ComputationRequested');
      expect(event).to.not.be.undefined;
    });

    it("Should submit computation result", async function () {
      // Create request
      const modelHash = ethers.utils.randomBytes(32);
      const inputDataHash = ethers.utils.randomBytes(32);
      const reward = ethers.utils.parseEther("100");

      await quantumGodToken.connect(addr2).approve(quantumAINetwork.address, reward);
      const tx = await quantumAINetwork.connect(addr2).requestComputation(
        modelHash,
        inputDataHash,
        reward
      );

      const receipt = await tx.wait();
      const requestEvent = receipt.events.find(e => e.event === 'ComputationRequested');
      const requestId = requestEvent.args.requestId;

      // Assign task to node
      await quantumAINetwork.connect(addr1).assignComputationTask(requestId);

      // Submit result
      const resultHash = ethers.utils.randomBytes(32);
      const quantumProof = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32'],
          [inputDataHash, resultHash, ethers.utils.randomBytes(32)]
        )
      );

      await expect(quantumAINetwork.connect(addr1).submitComputationResult(
        requestId,
        resultHash,
        quantumProof
      )).to.emit(quantumAINetwork, "ComputationCompleted");
    });
  });

  describe("Node Management", function () {
    it("Should deactivate node", async function () {
      // Register node first
      const quantumPublicKey = ethers.utils.randomBytes(32);
      const supportedModels = [ethers.utils.randomBytes(32)];
      await quantumGodToken.connect(addr1).approve(quantumAINetwork.address, ethers.utils.parseEther("1000"));
      await quantumAINetwork.connect(addr1).registerNode(quantumPublicKey, supportedModels);

      await expect(quantumAINetwork.connect(addr1).deactivateNode())
        .to.emit(quantumAINetwork, "NodeDeactivated");

      const node = await quantumAINetwork.nodes(addr1.address);
      expect(node.isActive).to.be.false;
    });
  });
});
