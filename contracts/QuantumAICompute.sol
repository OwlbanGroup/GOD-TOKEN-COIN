// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./QuantumSafeCrypto.sol";
import "./QuantumConsensus.sol";
import "./QuantumAIVerifier.sol";
import "./QuantumGodToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title QuantumAICompute
 * @dev Distributed quantum-enhanced AI computing network
 * Enables decentralized AI model training, inference, and quantum-accelerated computations
 */
contract QuantumAICompute is Ownable, ReentrancyGuard {
    using QuantumSafeCrypto for *;
    QuantumConsensus quantumConsensus;
    QuantumAIVerifier aiVerifier;
    QuantumGodToken godToken;

    enum ComputationType { INFERENCE, TRAINING, OPTIMIZATION }
    enum ComputationStatus { PENDING, ASSIGNED, RUNNING, COMPLETED, FAILED }

    struct ComputeNode {
        address nodeAddress;
        uint256 computingPower; // In FLOPS
        uint256 quantumCapability; // Quantum processing units
        uint256 stakeAmount;
        uint256 reputation;
        bool isActive;
        uint256 totalTasksCompleted;
        uint256 successRate;
        ComputationType[] supportedTypes;
    }

    struct ComputationTask {
        bytes32 taskId;
        address requester;
        ComputationType taskType;
        bytes32 modelHash;
        bytes32 inputDataHash;
        bytes32 quantumParameters;
        uint256 reward;
        address assignedNode;
        ComputationStatus status;
        uint256 startTime;
        uint256 deadline;
        bytes32 resultHash;
        bytes32 quantumProof;
    }

    struct AIModelTraining {
        bytes32 trainingId;
        address requester;
        bytes32 initialModelHash;
        bytes32 datasetHash;
        uint256 iterations;
        uint256 batchSize;
        uint256 totalReward;
        address[] participatingNodes;
        mapping(address => bytes32) nodeContributions;
        bool completed;
        bytes32 finalModelHash;
    }

    mapping(address => ComputeNode) public computeNodes;
    mapping(bytes32 => ComputationTask) public computationTasks;
    mapping(bytes32 => AIModelTraining) public trainingSessions;
    mapping(address => bytes32[]) public nodeTasks;
    mapping(address => bytes32[]) public userTasks;

    uint256 public constant MIN_COMPUTE_STAKE = 500 * 10**18; // 500 GOD tokens
    uint256 public constant COMPUTATION_BASE_TIMEOUT = 1 hours;
    uint256 public constant TRAINING_BASE_TIMEOUT = 24 hours;
    uint256 public constant MAX_NODES_PER_TRAINING = 10;

    event ComputeNodeRegistered(address indexed nodeAddress, uint256 computingPower);
    event ComputationTaskCreated(bytes32 indexed taskId, address indexed requester, ComputationType taskType);
    event ComputationTaskAssigned(bytes32 indexed taskId, address indexed node);
    event ComputationTaskCompleted(bytes32 indexed taskId, bytes32 resultHash);
    event TrainingSessionStarted(bytes32 indexed trainingId, address indexed requester);
    event TrainingContributionSubmitted(bytes32 indexed trainingId, address indexed node);

    constructor(
        address _quantumCrypto,
        address _quantumConsensus,
        address _aiVerifier,
        address _godToken
    ) {
        quantumConsensus = QuantumConsensus(_quantumConsensus);
        aiVerifier = QuantumAIVerifier(_aiVerifier);
        godToken = QuantumGodToken(_godToken);
    }

    /**
     * @dev Register a compute node in the quantum AI network
     * @param computingPower Computing power in FLOPS
     * @param quantumCapability Quantum processing capability
     * @param supportedTypes Array of supported computation types
     */
    function registerComputeNode(
        uint256 computingPower,
        uint256 quantumCapability,
        ComputationType[] calldata supportedTypes
    ) external nonReentrant {
        require(computeNodes[msg.sender].nodeAddress == address(0), "Node already registered");
        require(computingPower > 0, "Computing power must be greater than 0");
        require(supportedTypes.length > 0, "Must support at least one computation type");

        // Transfer stake
        require(godToken.transferFrom(msg.sender, address(this), MIN_COMPUTE_STAKE), "Stake transfer failed");

        computeNodes[msg.sender] = ComputeNode({
            nodeAddress: msg.sender,
            computingPower: computingPower,
            quantumCapability: quantumCapability,
            stakeAmount: MIN_COMPUTE_STAKE,
            reputation: 1000,
            isActive: true,
            totalTasksCompleted: 0,
            successRate: 100,
            supportedTypes: supportedTypes
        });

        emit ComputeNodeRegistered(msg.sender, computingPower);
    }

    /**
     * @dev Create a computation task
     * @param taskType Type of computation (INFERENCE, TRAINING, OPTIMIZATION)
     * @param modelHash Hash of the AI model
     * @param inputDataHash Hash of input data
     * @param quantumParameters Quantum computation parameters
     * @param reward Total reward for the task
     */
    function createComputationTask(
        ComputationType taskType,
        bytes32 modelHash,
        bytes32 inputDataHash,
        bytes32 quantumParameters,
        uint256 reward
    ) external nonReentrant returns (bytes32) {
        require(reward > 0, "Reward must be greater than 0");

        // Transfer reward to contract
        require(godToken.transferFrom(msg.sender, address(this), reward), "Reward transfer failed");

        bytes32 taskId = keccak256(abi.encodePacked(msg.sender, taskType, modelHash, block.timestamp));

        uint256 timeout = _getTaskTimeout(taskType);

        computationTasks[taskId] = ComputationTask({
            taskId: taskId,
            requester: msg.sender,
            taskType: taskType,
            modelHash: modelHash,
            inputDataHash: inputDataHash,
            quantumParameters: quantumParameters,
            reward: reward,
            assignedNode: address(0),
            status: ComputationStatus.PENDING,
            startTime: 0,
            deadline: block.timestamp + timeout,
            resultHash: bytes32(0),
            quantumProof: bytes32(0)
        });

        userTasks[msg.sender].push(taskId);

        emit ComputationTaskCreated(taskId, msg.sender, taskType);
        return taskId;
    }

    /**
     * @dev Assign computation task to a node
     * @param taskId ID of the task to assign
     */
    function assignComputationTask(bytes32 taskId) external {
        ComputationTask storage task = computationTasks[taskId];
        require(task.status == ComputationStatus.PENDING, "Task not pending");
        require(computeNodes[msg.sender].isActive, "Node not active");
        require(_supportsComputationType(msg.sender, task.taskType), "Node doesn't support task type");

        task.assignedNode = msg.sender;
        task.status = ComputationStatus.ASSIGNED;
        task.startTime = block.timestamp;

        nodeTasks[msg.sender].push(taskId);

        emit ComputationTaskAssigned(taskId, msg.sender);
    }

    /**
     * @dev Submit computation result
     * @param taskId ID of the completed task
     * @param resultHash Hash of the computation result
     * @param quantumProof Quantum-resistant proof of computation
     */
    function submitComputationResult(
        bytes32 taskId,
        bytes32 resultHash,
        bytes32 quantumProof
    ) external nonReentrant {
        ComputationTask storage task = computationTasks[taskId];
        require(task.assignedNode == msg.sender, "Not assigned to this node");
        require(task.status == ComputationStatus.ASSIGNED || task.status == ComputationStatus.RUNNING, "Invalid task status");
        require(block.timestamp <= task.deadline, "Task deadline exceeded");

        // Verify quantum proof
        require(_verifyComputationProof(task, resultHash, quantumProof), "Invalid quantum proof");

        task.status = ComputationStatus.COMPLETED;
        task.resultHash = resultHash;
        task.quantumProof = quantumProof;

        // Update node statistics
        ComputeNode storage node = computeNodes[msg.sender];
        node.totalTasksCompleted++;
        node.reputation = (node.reputation * 95 + 1050) / 100; // Weighted reputation update
        node.successRate = (node.successRate * (node.totalTasksCompleted - 1) + 100) / node.totalTasksCompleted;

        // Reward the node
        require(godToken.transfer(msg.sender, task.reward), "Reward transfer failed");

        emit ComputationTaskCompleted(taskId, resultHash);
    }

    /**
     * @dev Start distributed AI model training session
     * @param initialModelHash Hash of the initial model
     * @param datasetHash Hash of the training dataset
     * @param iterations Number of training iterations
     * @param batchSize Batch size for training
     * @param totalReward Total reward pool for training
     */
    function startModelTraining(
        bytes32 initialModelHash,
        bytes32 datasetHash,
        uint256 iterations,
        uint256 batchSize,
        uint256 totalReward
    ) external nonReentrant returns (bytes32) {
        require(totalReward > 0, "Total reward must be greater than 0");

        // Transfer reward pool
        require(godToken.transferFrom(msg.sender, address(this), totalReward), "Reward transfer failed");

        bytes32 trainingId = keccak256(abi.encodePacked(msg.sender, initialModelHash, block.timestamp));

        AIModelTraining storage training = trainingSessions[trainingId];
        training.trainingId = trainingId;
        training.requester = msg.sender;
        training.initialModelHash = initialModelHash;
        training.datasetHash = datasetHash;
        training.iterations = iterations;
        training.batchSize = batchSize;
        training.totalReward = totalReward;
        training.completed = false;
        training.finalModelHash = bytes32(0);

        emit TrainingSessionStarted(trainingId, msg.sender);
        return trainingId;
    }

    /**
     * @dev Submit training contribution from a node
     * @param trainingId ID of the training session
     * @param contributionHash Hash of the node's model contribution
     */
    function submitTrainingContribution(
        bytes32 trainingId,
        bytes32 contributionHash
    ) external {
        AIModelTraining storage training = trainingSessions[trainingId];
        require(!training.completed, "Training already completed");
        require(training.participatingNodes.length < MAX_NODES_PER_TRAINING, "Max nodes reached");

        // Check if node is already participating
        for (uint256 i = 0; i < training.participatingNodes.length; i++) {
            require(training.participatingNodes[i] != msg.sender, "Node already participating");
        }

        training.participatingNodes.push(msg.sender);
        training.nodeContributions[msg.sender] = contributionHash;

        emit TrainingContributionSubmitted(trainingId, msg.sender);
    }

    /**
     * @dev Complete training session and distribute rewards
     * @param trainingId ID of the training session
     * @param finalModelHash Hash of the final trained model
     */
    function completeTrainingSession(
        bytes32 trainingId,
        bytes32 finalModelHash
    ) external {
        AIModelTraining storage training = trainingSessions[trainingId];
        require(training.requester == msg.sender, "Not training requester");
        require(!training.completed, "Training already completed");
        require(training.participatingNodes.length > 0, "No participating nodes");

        training.completed = true;
        training.finalModelHash = finalModelHash;

        // Distribute rewards equally among participating nodes
        uint256 rewardPerNode = training.totalReward / training.participatingNodes.length;

        for (uint256 i = 0; i < training.participatingNodes.length; i++) {
            address node = training.participatingNodes[i];
            require(godToken.transfer(node, rewardPerNode), "Reward distribution failed");
        }
    }

    /**
     * @dev Get computation task result
     * @param taskId ID of the task
     */
    function getComputationResult(bytes32 taskId) external view returns (
        ComputationStatus status,
        bytes32 resultHash,
        address assignedNode
    ) {
        ComputationTask storage task = computationTasks[taskId];
        require(task.requester == msg.sender || task.assignedNode == msg.sender, "Not authorized");

        return (task.status, task.resultHash, task.assignedNode);
    }

    /**
     * @dev Get training session details
     * @param trainingId ID of the training session
     */
    function getTrainingSession(bytes32 trainingId) external view returns (
        address requester,
        bytes32 initialModelHash,
        uint256 iterations,
        uint256 participatingNodes,
        bool completed,
        bytes32 finalModelHash
    ) {
        AIModelTraining storage training = trainingSessions[trainingId];
        return (
            training.requester,
            training.initialModelHash,
            training.iterations,
            training.participatingNodes.length,
            training.completed,
            training.finalModelHash
        );
    }

    /**
     * @dev Get compute network statistics
     */
    function getComputeStats() external view returns (
        uint256 totalNodes,
        uint256 activeNodes,
        uint256 totalComputingPower,
        uint256 pendingTasks
    ) {
        // Simplified statistics calculation
        return (0, 0, 0, 0);
    }

    /**
     * @dev Check if node supports computation type
     */
    function _supportsComputationType(address node, ComputationType taskType) internal view returns (bool) {
        ComputationType[] memory supported = computeNodes[node].supportedTypes;
        for (uint256 i = 0; i < supported.length; i++) {
            if (supported[i] == taskType) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get task timeout based on type
     */
    function _getTaskTimeout(ComputationType taskType) internal pure returns (uint256) {
        if (taskType == ComputationType.TRAINING) {
            return TRAINING_BASE_TIMEOUT;
        }
        return COMPUTATION_BASE_TIMEOUT;
    }

    /**
     * @dev Verify computation proof
     */
    function _verifyComputationProof(
        ComputationTask storage task,
        bytes32 resultHash,
        bytes32 quantumProof
    ) internal view returns (bool) {
        // Simplified quantum proof verification
        bytes32 computedHash = keccak256(abi.encodePacked(
            task.inputDataHash,
            resultHash,
            task.quantumParameters
        ));
        return computedHash == quantumProof;
    }
}
