// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./QuantumSafeCrypto.sol";
import "./QuantumConsensus.sol";
import "./QuantumAIVerifier.sol";
import "./QuantumGodToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title QuantumAINetwork
 * @dev Core contract for the decentralized Quantum AI Internet
 * Enables quantum-secured node communication, AI model distribution, and decentralized AI execution
 */
contract QuantumAINetwork is Ownable, ReentrancyGuard {
    using QuantumSafeCrypto for *;
    QuantumConsensus quantumConsensus;
    QuantumAIVerifier aiVerifier;
    QuantumGodToken godToken;

    struct QuantumNode {
        address nodeAddress;
        bytes32 quantumPublicKey;
        uint256 stakeAmount;
        uint256 reputation;
        bool isActive;
        uint256 lastActivity;
        bytes32[] supportedModels;
    }

    struct AIModel {
        bytes32 modelHash;
        address creator;
        bytes32 quantumSignature;
        uint256 version;
        bool isVerified;
        uint256 totalComputations;
        uint256 successRate;
    }

    struct ComputationRequest {
        bytes32 requestId;
        address requester;
        bytes32 modelHash;
        bytes32 inputHash;
        uint256 reward;
        address assignedNode;
        uint256 deadline;
        bool completed;
        bytes32 resultHash;
    }

    mapping(address => QuantumNode) public nodes;
    mapping(bytes32 => AIModel) public aiModels;
    mapping(bytes32 => ComputationRequest) public computationRequests;
    mapping(address => bytes32[]) public nodeModels;
    mapping(bytes32 => address[]) public modelNodes;

    uint256 public constant MIN_STAKE = 1000 * 10**18; // 1000 GOD tokens
    uint256 public constant COMPUTATION_TIMEOUT = 1 hours;
    uint256 public constant NODE_INACTIVITY_THRESHOLD = 7 days;

    event NodeRegistered(address indexed nodeAddress, bytes32 quantumPublicKey);
    event NodeDeactivated(address indexed nodeAddress);
    event AIModelRegistered(bytes32 indexed modelHash, address indexed creator);
    event ComputationRequested(bytes32 indexed requestId, address indexed requester, bytes32 modelHash);
    event ComputationCompleted(bytes32 indexed requestId, address indexed node, bytes32 resultHash);
    event NodeReputationUpdated(address indexed node, uint256 newReputation);

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
     * @dev Register a new quantum node in the network
     * @param quantumPublicKey The node's quantum-resistant public key
     * @param supportedModels Array of AI model hashes this node can execute
     */
    function registerNode(
        bytes32 quantumPublicKey,
        bytes32[] calldata supportedModels
    ) external nonReentrant {
        require(nodes[msg.sender].nodeAddress == address(0), "Node already registered");
        require(supportedModels.length > 0, "Must support at least one model");

        // Transfer stake from node to contract
        require(godToken.transferFrom(msg.sender, address(this), MIN_STAKE), "Stake transfer failed");

        nodes[msg.sender] = QuantumNode({
            nodeAddress: msg.sender,
            quantumPublicKey: quantumPublicKey,
            stakeAmount: MIN_STAKE,
            reputation: 1000, // Base reputation
            isActive: true,
            lastActivity: block.timestamp,
            supportedModels: supportedModels
        });

        // Update model-node mappings
        for (uint256 i = 0; i < supportedModels.length; i++) {
            nodeModels[msg.sender].push(supportedModels[i]);
            modelNodes[supportedModels[i]].push(msg.sender);
        }

        emit NodeRegistered(msg.sender, quantumPublicKey);
    }

    /**
     * @dev Deactivate a quantum node
     */
    function deactivateNode() external {
        require(nodes[msg.sender].isActive, "Node not active");

        nodes[msg.sender].isActive = false;

        // Return stake
        require(godToken.transfer(msg.sender, nodes[msg.sender].stakeAmount), "Stake return failed");

        emit NodeDeactivated(msg.sender);
    }

    /**
     * @dev Register a new AI model on the network
     * @param modelHash Hash of the AI model
     * @param quantumSignature Quantum-resistant signature of the model
     */
    function registerAIModel(bytes32 modelHash, bytes32 quantumSignature) external {
        require(aiModels[modelHash].creator == address(0), "Model already registered");

        aiModels[modelHash] = AIModel({
            modelHash: modelHash,
            creator: msg.sender,
            quantumSignature: quantumSignature,
            version: 1,
            isVerified: false,
            totalComputations: 0,
            successRate: 100
        });

        emit AIModelRegistered(modelHash, msg.sender);
    }

    /**
     * @dev Request AI computation on the quantum network
     * @param modelHash Hash of the AI model to use
     * @param inputHash Hash of the input data
     * @param reward Amount of GOD tokens to reward the computing node
     */
    function requestComputation(
        bytes32 modelHash,
        bytes32 inputHash,
        uint256 reward
    ) external nonReentrant returns (bytes32) {
        require(aiModels[modelHash].creator != address(0), "Model not registered");
        require(modelNodes[modelHash].length > 0, "No nodes support this model");

        // Transfer reward to contract
        require(godToken.transferFrom(msg.sender, address(this), reward), "Reward transfer failed");

        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, modelHash, inputHash, block.timestamp));

        // Select best node based on reputation and stake
        address selectedNode = _selectBestNode(modelHash);

        computationRequests[requestId] = ComputationRequest({
            requestId: requestId,
            requester: msg.sender,
            modelHash: modelHash,
            inputHash: inputHash,
            reward: reward,
            assignedNode: selectedNode,
            deadline: block.timestamp + COMPUTATION_TIMEOUT,
            completed: false,
            resultHash: bytes32(0)
        });

        emit ComputationRequested(requestId, msg.sender, modelHash);
        return requestId;
    }

    /**
     * @dev Submit computation result from a node
     * @param requestId The computation request ID
     * @param resultHash Hash of the computation result
     * @param quantumProof Quantum-resistant proof of computation
     */
    function submitComputationResult(
        bytes32 requestId,
        bytes32 resultHash,
        bytes32 quantumProof
    ) external {
        ComputationRequest storage request = computationRequests[requestId];
        require(request.assignedNode == msg.sender, "Not assigned to this node");
        require(!request.completed, "Request already completed");
        require(block.timestamp <= request.deadline, "Computation timeout");

        QuantumNode storage node = nodes[msg.sender];
        require(node.isActive, "Node not active");

        // Verify quantum proof (simplified for demo)
        require(_verifyQuantumProof(quantumProof, request.inputHash, resultHash), "Invalid quantum proof");

        // Mark as completed
        request.completed = true;
        request.resultHash = resultHash;

        // Update node reputation and activity
        node.reputation = (node.reputation * 95 + 1050) / 100; // Weighted average
        node.lastActivity = block.timestamp;

        // Update model statistics
        AIModel storage model = aiModels[request.modelHash];
        model.totalComputations++;
        model.successRate = (model.successRate * (model.totalComputations - 1) + 100) / model.totalComputations;

        // Reward the node
        require(godToken.transfer(msg.sender, request.reward), "Reward transfer failed");

        emit ComputationCompleted(requestId, msg.sender, resultHash);
        emit NodeReputationUpdated(msg.sender, node.reputation);
    }

    /**
     * @dev Get computation result
     * @param requestId The computation request ID
     */
    function getComputationResult(bytes32 requestId) external view returns (
        bool completed,
        bytes32 resultHash,
        address assignedNode
    ) {
        ComputationRequest storage request = computationRequests[requestId];
        require(request.requester == msg.sender || request.assignedNode == msg.sender, "Not authorized");

        return (request.completed, request.resultHash, request.assignedNode);
    }

    /**
     * @dev Clean up inactive nodes (only owner)
     */
    function cleanupInactiveNodes() external onlyOwner {
        // Implementation for cleaning up inactive nodes
        // This would iterate through nodes and deactivate those exceeding inactivity threshold
    }

    /**
     * @dev Select the best node for a computation based on reputation and stake
     */
    function _selectBestNode(bytes32 modelHash) internal view returns (address) {
        address[] storage availableNodes = modelNodes[modelHash];
        require(availableNodes.length > 0, "No available nodes");

        address bestNode = availableNodes[0];
        uint256 bestScore = 0;

        for (uint256 i = 0; i < availableNodes.length; i++) {
            address nodeAddr = availableNodes[i];
            QuantumNode storage node = nodes[nodeAddr];

            if (!node.isActive) continue;

            // Score based on reputation and stake
            uint256 score = node.reputation * node.stakeAmount / MIN_STAKE;
            if (score > bestScore) {
                bestScore = score;
                bestNode = nodeAddr;
            }
        }

        return bestNode;
    }

    /**
     * @dev Verify quantum proof of computation
     */
    function _verifyQuantumProof(
        bytes32 quantumProof,
        bytes32 inputHash,
        bytes32 resultHash
    ) internal pure returns (bool) {
        // Simplified quantum proof verification
        // In production, this would use quantum-resistant cryptographic verification
        bytes32 computedHash = keccak256(abi.encodePacked(inputHash, resultHash));
        return computedHash == quantumProof;
    }

    /**
     * @dev Get network statistics
     */
    function getNetworkStats() external pure returns (
        uint256 totalNodes,
        uint256 activeNodes,
        uint256 totalModels,
        uint256 totalComputations
    ) {
        uint256 activeCount = 0;
        uint256 modelCount = 0;
        uint256 computationCount = 0;

        // Count active nodes (simplified - would need proper iteration in production)
        // Count models and computations (simplified)

        return (0, activeCount, modelCount, computationCount); // Placeholder
    }
}
