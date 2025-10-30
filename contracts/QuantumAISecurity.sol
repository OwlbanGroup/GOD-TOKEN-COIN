// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./QuantumSafeCrypto.sol";
import "./QuantumAIVerifier.sol";
import "./QuantumConsensus.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title QuantumAISecurity
 * @dev Security layer for the Quantum AI Internet
 * Provides quantum-resistant authentication, AI anomaly detection, and secure multi-party computation
 */
contract QuantumAISecurity is Ownable, ReentrancyGuard {
    using QuantumSafeCrypto for *;
    QuantumAIVerifier aiVerifier;
    QuantumConsensus quantumConsensus;

    struct QuantumIdentity {
        address userAddress;
        bytes32 quantumPublicKey;
        bytes32 identityHash;
        uint256 trustScore;
        uint256 lastActivity;
        bool isActive;
        mapping(bytes32 => bool) authorizedSessions;
    }

    struct SecurityEvent {
        bytes32 eventId;
        address reporter;
        bytes32 eventType;
        bytes32 eventData;
        uint256 timestamp;
        uint256 severity;
        bool investigated;
        bytes32 aiAnalysisHash;
    }

    struct MultiPartyComputation {
        bytes32 computationId;
        address[] participants;
        bytes32 computationType;
        bytes32[] encryptedShares;
        mapping(address => bytes32) participantShares;
        mapping(address => bool) hasContributed;
        uint256 requiredParticipants;
        uint256 contributedCount;
        bool completed;
        bytes32 resultHash;
    }

    mapping(address => QuantumIdentity) public quantumIdentities;
    mapping(bytes32 => SecurityEvent) public securityEvents;
    mapping(bytes32 => MultiPartyComputation) public mpcComputations;
    mapping(address => bytes32[]) public userSecurityEvents;

    uint256 public constant MIN_TRUST_SCORE = 100;
    uint256 public constant MAX_TRUST_SCORE = 1000;
    uint256 public constant SECURITY_EVENT_TIMEOUT = 24 hours;
    uint256 public constant ANOMALY_DETECTION_THRESHOLD = 75; // AI confidence threshold

    event QuantumIdentityRegistered(address indexed userAddress, bytes32 quantumPublicKey);
    event SecurityEventReported(bytes32 indexed eventId, address indexed reporter, bytes32 eventType);
    event AnomalyDetected(bytes32 indexed eventId, uint256 aiConfidence);
    event MPCStarted(bytes32 indexed computationId, uint256 participantCount);
    event MPCCompleted(bytes32 indexed computationId, bytes32 resultHash);

    constructor(
        address _quantumCrypto,
        address _aiVerifier,
        address _quantumConsensus
    ) {
        aiVerifier = QuantumAIVerifier(_aiVerifier);
        quantumConsensus = QuantumConsensus(_quantumConsensus);
    }

    /**
     * @dev Register quantum identity for secure authentication
     * @param quantumPublicKey Quantum-resistant public key
     * @param identityData Additional identity verification data
     */
    function registerQuantumIdentity(
        bytes32 quantumPublicKey,
        bytes32 identityData
    ) external {
        require(quantumIdentities[msg.sender].userAddress == address(0), "Identity already registered");

        bytes32 identityHash = keccak256(abi.encodePacked(msg.sender, quantumPublicKey, identityData));

        QuantumIdentity storage identity = quantumIdentities[msg.sender];
        identity.userAddress = msg.sender;
        identity.quantumPublicKey = quantumPublicKey;
        identity.identityHash = identityHash;
        identity.trustScore = 500; // Initial trust score
        identity.lastActivity = block.timestamp;
        identity.isActive = true;

        emit QuantumIdentityRegistered(msg.sender, quantumPublicKey);
    }

    /**
     * @dev Authenticate using quantum signature
     * @param messageHash Hash of the message to authenticate
     * @param quantumSignature Quantum-resistant signature
     * @param sessionId Session identifier
     */
    function authenticateQuantum(
        bytes32 messageHash,
        bytes32 quantumSignature,
        bytes32 sessionId
    ) external returns (bool) {
        QuantumIdentity storage identity = quantumIdentities[msg.sender];
        require(identity.isActive, "Identity not active");

        // Verify quantum signature (simplified)
        bool isValid = _verifyQuantumSignature(msg.sender, messageHash, quantumSignature);
        if (isValid) {
            identity.authorizedSessions[sessionId] = true;
            identity.lastActivity = block.timestamp;
            _updateTrustScore(msg.sender, true);
        } else {
            _updateTrustScore(msg.sender, false);
        }

        return isValid;
    }

    /**
     * @dev Report security event for AI analysis
     * @param eventType Type of security event
     * @param eventData Data associated with the event
     * @param severity Severity level (1-100)
     */
    function reportSecurityEvent(
        bytes32 eventType,
        bytes32 eventData,
        uint256 severity
    ) external returns (bytes32) {
        require(severity >= 1 && severity <= 100, "Invalid severity level");

        bytes32 eventId = keccak256(abi.encodePacked(msg.sender, eventType, eventData, block.timestamp));

        securityEvents[eventId] = SecurityEvent({
            eventId: eventId,
            reporter: msg.sender,
            eventType: eventType,
            eventData: eventData,
            timestamp: block.timestamp,
            severity: severity,
            investigated: false,
            aiAnalysisHash: bytes32(0)
        });

        userSecurityEvents[msg.sender].push(eventId);

        emit SecurityEventReported(eventId, msg.sender, eventType);

        // Trigger AI anomaly detection
        _analyzeSecurityEvent(eventId);

        return eventId;
    }

    /**
     * @dev Start multi-party computation session
     * @param participants Array of participant addresses
     * @param computationType Type of computation
     * @param requiredParticipants Minimum number of participants required
     */
    function startMultiPartyComputation(
        address[] calldata participants,
        bytes32 computationType,
        uint256 requiredParticipants
    ) external returns (bytes32) {
        require(participants.length >= 2, "Need at least 2 participants");
        require(requiredParticipants <= participants.length, "Required participants exceeds total");

        bytes32 computationId = keccak256(abi.encodePacked(msg.sender, computationType, block.timestamp));

        MultiPartyComputation storage mpc = mpcComputations[computationId];
        mpc.computationId = computationId;
        mpc.participants = participants;
        mpc.computationType = computationType;
        mpc.requiredParticipants = requiredParticipants;
        mpc.completed = false;
        mpc.resultHash = bytes32(0);

        emit MPCStarted(computationId, participants.length);
        return computationId;
    }

    /**
     * @dev Submit encrypted share for multi-party computation
     * @param computationId ID of the MPC session
     * @param encryptedShare Encrypted share data
     */
    function submitMPCShare(
        bytes32 computationId,
        bytes32 encryptedShare
    ) external {
        MultiPartyComputation storage mpc = mpcComputations[computationId];
        require(!mpc.completed, "MPC already completed");
        require(_isParticipant(mpc, msg.sender), "Not a participant");

        require(!mpc.hasContributed[msg.sender], "Already contributed");

        mpc.participantShares[msg.sender] = encryptedShare;
        mpc.encryptedShares.push(encryptedShare);
        mpc.hasContributed[msg.sender] = true;
        mpc.contributedCount++;

        // Check if we have enough contributions
        if (mpc.contributedCount >= mpc.requiredParticipants) {
            _completeMPC(computationId);
        }
    }

    /**
     * @dev Get security event analysis
     * @param eventId ID of the security event
     */
    function getSecurityEventAnalysis(bytes32 eventId) external view returns (
        bytes32 eventType,
        uint256 severity,
        bool investigated,
        bytes32 aiAnalysisHash
    ) {
        SecurityEvent storage event_ = securityEvents[eventId];
        return (
            event_.eventType,
            event_.severity,
            event_.investigated,
            event_.aiAnalysisHash
        );
    }

    /**
     * @dev Get quantum identity trust score
     * @param user Address of the user
     */
    function getIdentityTrustScore(address user) external view returns (uint256) {
        return quantumIdentities[user].trustScore;
    }

    /**
     * @dev Check if session is authorized
     * @param user User address
     * @param sessionId Session ID
     */
    function isSessionAuthorized(address user, bytes32 sessionId) external view returns (bool) {
        return quantumIdentities[user].authorizedSessions[sessionId];
    }

    /**
     * @dev Get MPC computation result
     * @param computationId ID of the MPC session
     */
    function getMPCResult(bytes32 computationId) external view returns (
        bool completed,
        bytes32 resultHash,
        uint256 participantCount
    ) {
        MultiPartyComputation storage mpc = mpcComputations[computationId];
        require(_isParticipant(mpc, msg.sender), "Not a participant");

        return (mpc.completed, mpc.resultHash, mpc.participants.length);
    }

    /**
     * @dev Analyze security event using AI
     */
    function _analyzeSecurityEvent(bytes32 eventId) internal {
        SecurityEvent storage event_ = securityEvents[eventId];

        // Request AI analysis for anomaly detection
        uint256 requestId = aiVerifier.requestQuantumAIVerification(
            2, // security analysis type
            ANOMALY_DETECTION_THRESHOLD,
            95,
            event_.eventData
        );

        event_.aiAnalysisHash = bytes32(requestId);

        // In production, this would trigger an event for off-chain AI processing
        // For now, we'll simulate anomaly detection
        if (event_.severity > 80) {
            emit AnomalyDetected(eventId, 85); // Simulated high confidence anomaly
        }
    }

    /**
     * @dev Complete multi-party computation
     */
    function _completeMPC(bytes32 computationId) internal {
        MultiPartyComputation storage mpc = mpcComputations[computationId];

        // Combine encrypted shares (simplified - would use proper MPC protocol)
        bytes32 combinedResult = keccak256(abi.encodePacked(mpc.encryptedShares));

        mpc.completed = true;
        mpc.resultHash = combinedResult;

        emit MPCCompleted(computationId, combinedResult);
    }

    /**
     * @dev Verify quantum signature
     */
    function _verifyQuantumSignature(
        address signer,
        bytes32 messageHash,
        bytes32 signature
    ) internal view returns (bool) {
        QuantumIdentity storage identity = quantumIdentities[signer];
        if (!identity.isActive) return false;

        // Simplified quantum signature verification
        bytes32 expectedSignature = keccak256(abi.encodePacked(
            identity.quantumPublicKey,
            messageHash,
            identity.identityHash
        ));

        return expectedSignature == signature;
    }

    /**
     * @dev Update user trust score
     */
    function _updateTrustScore(address user, bool positive) internal {
        QuantumIdentity storage identity = quantumIdentities[user];
        uint256 change = positive ? 50 : 20; // Increased positive change for testing

        if (positive && identity.trustScore < MAX_TRUST_SCORE) {
            identity.trustScore += change;
            if (identity.trustScore > MAX_TRUST_SCORE) {
                identity.trustScore = MAX_TRUST_SCORE;
            }
        } else if (!positive && identity.trustScore > MIN_TRUST_SCORE) {
            identity.trustScore -= change;
            if (identity.trustScore < MIN_TRUST_SCORE) {
                identity.trustScore = MIN_TRUST_SCORE;
            }
        }
    }

    /**
     * @dev Check if address is a participant in MPC
     */
    function _isParticipant(MultiPartyComputation storage mpc, address participant) internal view returns (bool) {
        for (uint256 i = 0; i < mpc.participants.length; i++) {
            if (mpc.participants[i] == participant) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get security statistics
     */
    function getSecurityStats() external view returns (
        uint256 totalIdentities,
        uint256 activeIdentities,
        uint256 totalSecurityEvents,
        uint256 highSeverityEvents
    ) {
        // Simplified statistics
        return (0, 0, 0, 0);
    }
}
