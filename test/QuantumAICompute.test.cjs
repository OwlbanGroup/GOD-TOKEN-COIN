const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumAICompute", function () {
  let quantumSafeCrypto, quantumConsensus, quantumAIVerifier, quantumGodToken, quantumAICompute;
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
    const QuantumAICompute = await ethers.getContractFactory("QuantumAICompute");
    quantumAICompute = await QuantumAICompute.deploy(
      quantumSafeCrypto.address,
      quantumConsensus.address,
      quantumAIVerifier.address,
      quantumGodToken.address
    );
    await quantumAICompute.deployed();

    // Mint tokens for testing
    await quantumGodToken.mint(addr1.address, ethers.utils.parseEther("10000"));
    await quantumGodToken.mint(addr2.address, ethers.utils.parseEther("10000"));
  });

  describe("Compute Node Registration", function () {
    it("Should register a compute node", async function () {
      const computingPower = 1000000; // 1 MFLOPS
      const quantumCapability = 100; // 100 qubits
      const supportedTypes = [0, 1]; // INFERENCE and TRAINING

      await quantumGodToken.connect(addr1).approve(quantumAICompute.address, ethers.utils.parseEther("500"));

      await expect(quantumAICompute.connect(addr1).registerComputeNode(
        computingPower,
        quantumCapability,
        supportedTypes
      )).to.emit(quantumAICompute, "ComputeNodeRegistered");

      const node = await quantumAICompute.computeNodes(addr1.address);
      expect(node.isActive).to.be.true;
      expect(node.computingPower).to.equal(computingPower);
      expect(node.quantumCapability).to.equal(quantumCapability);
    });

    it("Should reject registering node without stake", async function () {
      const computingPower = 1000000;
      const quantumCapability = 100;
      const supportedTypes = [0];

      await expect(quantumAICompute.connect(addr1).registerComputeNode(
        computingPower,
        quantumCapability,
        supportedTypes
      )).to.be.revertedWith("Stake transfer failed");
    });
  });

  describe("Computation Tasks", function () {
    beforeEach(async function () {
      // Register a compute node
      const computingPower = 1000000;
      const quantumCapability = 100;
      const supportedTypes = [0, 1]; // INFERENCE and TRAINING

      await quantumGodToken.connect(addr1).approve(quantumAICompute.address, ethers.utils.parseEther("500"));
      await quantumAICompute.connect(addr1).registerComputeNode(
        computingPower,
        quantumCapability,
        supportedTypes
      );
    });

    it("Should create computation task", async function () {
      const taskType = 0; // INFERENCE
      const modelHash = ethers.utils.randomBytes(32);
      const inputDataHash = ethers.utils.randomBytes(32);
      const quantumParameters = ethers.utils.randomBytes(32);
      const reward = ethers.utils.parseEther("100");

      await quantumGodToken.connect(addr2).approve(quantumAICompute.address, reward);

      const tx = await quantumAICompute.connect(addr2).createComputationTask(
        taskType,
        modelHash,
        inputDataHash,
        quantumParameters,
        reward
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ComputationTaskCreated');
      expect(event).to.not.be.undefined;
    });

    it("Should assign computation task to node", async function () {
      // Create task
      const taskType = 0;
      const modelHash = ethers.utils.randomBytes(32);
      const inputDataHash = ethers.utils.randomBytes(32);
      const quantumParameters = ethers.utils.randomBytes(32);
      const reward = ethers.utils.parseEther("100");

      await quantumGodToken.connect(addr2).approve(quantumAICompute.address, reward);
      const createTx = await quantumAICompute.connect(addr2).createComputationTask(
        taskType,
        modelHash,
        inputDataHash,
        quantumParameters,
        reward
      );
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt.events.find(e => e.event === 'ComputationTaskCreated');
      const taskId = createEvent.args.taskId;

      // Assign task
      await expect(quantumAICompute.connect(addr1).assignComputationTask(taskId))
        .to.emit(quantumAICompute, "ComputationTaskAssigned");

      const task = await quantumAICompute.computationTasks(taskId);
      expect(task.assignedNode).to.equal(addr1.address);
      expect(task.status).to.equal(1); // ASSIGNED
    });

    it("Should submit computation result", async function () {
      // Create and assign task
      const taskType = 0;
      const modelHash = ethers.utils.randomBytes(32);
      const inputDataHash = ethers.utils.randomBytes(32);
      const quantumParameters = ethers.utils.randomBytes(32);
      const reward = ethers.utils.parseEther("100");

      await quantumGodToken.connect(addr2).approve(quantumAICompute.address, reward);
      const createTx = await quantumAICompute.connect(addr2).createComputationTask(
        taskType,
        modelHash,
        inputDataHash,
        quantumParameters,
        reward
      );
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt.events.find(e => e.event === 'ComputationTaskCreated');
      const taskId = createEvent.args.taskId;

      await quantumAICompute.connect(addr1).assignComputationTask(taskId);

      // Submit result
      const resultHash = ethers.utils.randomBytes(32);
      const quantumProof = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32'],
          [inputDataHash, resultHash, quantumParameters]
        )
      );

      await expect(quantumAICompute.connect(addr1).submitComputationResult(
        taskId,
        resultHash,
        quantumProof
      )).to.emit(quantumAICompute, "ComputationTaskCompleted");

      const task = await quantumAICompute.computationTasks(taskId);
      expect(task.status).to.equal(3); // COMPLETED
      expect(task.resultHash).to.equal(resultHash);
    });
  });

  describe("AI Model Training", function () {
    beforeEach(async function () {
      // Register compute nodes
      const computingPower = 1000000;
      const quantumCapability = 100;
      const supportedTypes = [1]; // TRAINING

      await quantumGodToken.connect(addr1).approve(quantumAICompute.address, ethers.utils.parseEther("500"));
      await quantumAICompute.connect(addr1).registerComputeNode(
        computingPower,
        quantumCapability,
        supportedTypes
      );

      await quantumGodToken.connect(addr2).approve(quantumAICompute.address, ethers.utils.parseEther("500"));
      await quantumAICompute.connect(addr2).registerComputeNode(
        computingPower,
        quantumCapability,
        supportedTypes
      );
    });

    it("Should start distributed training session", async function () {
      const initialModelHash = ethers.utils.randomBytes(32);
      const datasetHash = ethers.utils.randomBytes(32);
      const iterations = 100;
      const batchSize = 32;
      const totalReward = ethers.utils.parseEther("1000");

      await quantumGodToken.connect(owner).approve(quantumAICompute.address, totalReward);

      const tx = await quantumAICompute.startModelTraining(
        initialModelHash,
        datasetHash,
        iterations,
        batchSize,
        totalReward
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TrainingSessionStarted');
      expect(event).to.not.be.undefined;
    });

    it("Should submit training contribution", async function () {
      // Start training
      const initialModelHash = ethers.utils.randomBytes(32);
      const datasetHash = ethers.utils.randomBytes(32);
      const iterations = 100;
      const batchSize = 32;
      const totalReward = ethers.utils.parseEther("1000");

      await quantumGodToken.connect(owner).approve(quantumAICompute.address, totalReward);
      const startTx = await quantumAICompute.startModelTraining(
        initialModelHash,
        datasetHash,
        iterations,
        batchSize,
        totalReward
      );
      const startReceipt = await startTx.wait();
      const startEvent = startReceipt.events.find(e => e.event === 'TrainingSessionStarted');
      const trainingId = startEvent.args.trainingId;

      // Submit contribution
      const contributionHash = ethers.utils.randomBytes(32);

      await expect(quantumAICompute.connect(addr1).submitTrainingContribution(
        trainingId,
        contributionHash
      )).to.emit(quantumAICompute, "TrainingContributionSubmitted");
    });

    it("Should complete training session", async function () {
      // Start training and submit contributions
      const initialModelHash = ethers.utils.randomBytes(32);
      const datasetHash = ethers.utils.randomBytes(32);
      const iterations = 100;
      const batchSize = 32;
      const totalReward = ethers.utils.parseEther("1000");

      await quantumGodToken.connect(owner).approve(quantumAICompute.address, totalReward);
      const startTx = await quantumAICompute.startModelTraining(
        initialModelHash,
        datasetHash,
        iterations,
        batchSize,
        totalReward
      );
      const startReceipt = await startTx.wait();
      const startEvent = startReceipt.events.find(e => e.event === 'TrainingSessionStarted');
      const trainingId = startEvent.args.trainingId;

      // Submit contributions from both nodes
      const contributionHash1 = ethers.utils.randomBytes(32);
      const contributionHash2 = ethers.utils.randomBytes(32);

      await quantumAICompute.connect(addr1).submitTrainingContribution(trainingId, contributionHash1);
      await quantumAICompute.connect(addr2).submitTrainingContribution(trainingId, contributionHash2);

      // Complete training
      const finalModelHash = ethers.utils.randomBytes(32);

      await expect(quantumAICompute.completeTrainingSession(trainingId, finalModelHash))
        .to.emit(quantumAICompute, "TrainingCompleted");

      const training = await quantumAICompute.trainingSessions(trainingId);
      expect(training.completed).to.be.true;
      expect(training.finalModelHash).to.equal(finalModelHash);
    });
  });

  describe("Task Result Retrieval", function () {
    it("Should get computation result", async function () {
      // Create, assign, and complete a task
      const taskType = 0;
      const modelHash = ethers.utils.randomBytes(32);
      const inputDataHash = ethers.utils.randomBytes(32);
      const quantumParameters = ethers.utils.randomBytes(32);
      const reward = ethers.utils.parseEther("100");

      await quantumGodToken.connect(addr2).approve(quantumAICompute.address, reward);
      const createTx = await quantumAICompute.connect(addr2).createComputationTask(
        taskType,
        modelHash,
        inputDataHash,
        quantumParameters,
        reward
      );
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt.events.find(e => e.event === 'ComputationTaskCreated');
      const taskId = createEvent.args.taskId;

      await quantumAICompute.connect(addr1).assignComputationTask(taskId);

      const resultHash = ethers.utils.randomBytes(32);
      const quantumProof = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32'],
          [inputDataHash, resultHash, quantumParameters]
        )
      );

      await quantumAICompute.connect(addr1).submitComputationResult(taskId, resultHash, quantumProof);

      // Get result
      const [status, retrievedResultHash, assignedNode] = await quantumAICompute.getComputationResult(taskId);
      expect(status).to.equal(3); // COMPLETED
      expect(retrievedResultHash).to.equal(resultHash);
      expect(assignedNode).to.equal(addr1.address);
    });
  });

  describe("Training Session Queries", function () {
    it("Should get training session details", async function () {
      const initialModelHash = ethers.utils.randomBytes(32);
      const datasetHash = ethers.utils.randomBytes(32);
      const iterations = 100;
      const batchSize = 32;
      const totalReward = ethers.utils.parseEther("1000");

      await quantumGodToken.connect(owner).approve(quantumAICompute.address, totalReward);
      const tx = await quantumAICompute.startModelTraining(
        initialModelHash,
        datasetHash,
        iterations,
        batchSize,
        totalReward
      );
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TrainingSessionStarted');
      const trainingId = event.args.trainingId;

      const [requester, modelHash, retrievedIterations, participants, completed, finalModelHash] =
        await quantumAICompute.getTrainingSession(trainingId);

      expect(requester).to.equal(owner.address);
      expect(modelHash).to.equal(initialModelHash);
      expect(retrievedIterations).to.equal(iterations);
      expect(participants).to.equal(0);
      expect(completed).to.be.false;
    });
  });
});
