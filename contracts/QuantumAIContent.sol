// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./QuantumSafeCrypto.sol";
import "./QuantumAIVerifier.sol";
import "./QuantumGodToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title QuantumAIContent
 * @dev Decentralized content sharing and distribution on the Quantum AI Internet
 * Features quantum-encrypted storage, AI-powered content verification, and secure P2P sharing
 */
contract QuantumAIContent is Ownable, ReentrancyGuard {
    using QuantumSafeCrypto for *;
    QuantumAIVerifier aiVerifier;
    QuantumGodToken godToken;

    struct ContentItem {
        bytes32 contentHash;
        address creator;
        bytes32 quantumEncryptionKey;
        bytes32 aiVerificationHash;
        uint256 timestamp;
        bool isVerified;
        bool isEncrypted;
        uint256 accessFee;
        address[] authorizedViewers;
        mapping(address => bool) hasAccess;
    }

    struct ContentShare {
        bytes32 shareId;
        bytes32 contentHash;
        address sharer;
        address recipient;
        bytes32 quantumAccessKey;
        uint256 expirationTime;
        bool isActive;
    }

    mapping(bytes32 => ContentItem) public contentItems;
    mapping(bytes32 => ContentShare) public contentShares;
    mapping(address => bytes32[]) public userContent;
    mapping(address => bytes32[]) public sharedContent;

    uint256 public constant VERIFICATION_FEE = 10 * 10**18; // 10 GOD tokens
    uint256 public constant SHARING_FEE = 1 * 10**18; // 1 GOD token
    uint256 public constant MAX_SHARE_DURATION = 30 days;

    event ContentUploaded(bytes32 indexed contentHash, address indexed creator, bool isEncrypted);
    event ContentVerified(bytes32 indexed contentHash, address indexed verifier);
    event ContentShared(bytes32 indexed shareId, bytes32 indexed contentHash, address indexed recipient);
    event ContentAccessed(bytes32 indexed contentHash, address indexed accessor);

    constructor(
        address _quantumCrypto,
        address _aiVerifier,
        address _godToken
    ) {
        aiVerifier = QuantumAIVerifier(_aiVerifier);
        godToken = QuantumGodToken(_godToken);
    }

    /**
     * @dev Upload content to the quantum AI network
     * @param contentHash Hash of the content
     * @param quantumEncryptionKey Quantum-resistant encryption key (if encrypted)
     * @param isEncrypted Whether the content is quantum-encrypted
     * @param accessFee Fee to access the content (0 for free)
     */
    function uploadContent(
        bytes32 contentHash,
        bytes32 quantumEncryptionKey,
        bool isEncrypted,
        uint256 accessFee
    ) external {
        require(contentItems[contentHash].creator == address(0), "Content already exists");

        ContentItem storage item = contentItems[contentHash];
        item.contentHash = contentHash;
        item.creator = msg.sender;
        item.quantumEncryptionKey = quantumEncryptionKey;
        item.timestamp = block.timestamp;
        item.isVerified = false;
        item.isEncrypted = isEncrypted;
        item.accessFee = accessFee;

        userContent[msg.sender].push(contentHash);

        emit ContentUploaded(contentHash, msg.sender, isEncrypted);
    }

    /**
     * @dev Request AI verification for content
     * @param contentHash Hash of the content to verify
     * @param verificationData Additional data for AI verification
     */
    function requestContentVerification(
        bytes32 contentHash,
        bytes32 verificationData
    ) external payable nonReentrant {
        ContentItem storage item = contentItems[contentHash];
        require(item.creator != address(0), "Content does not exist");
        require(!item.isVerified, "Content already verified");

        // Pay verification fee
        require(msg.value >= VERIFICATION_FEE, "Insufficient verification fee");

        // Request AI verification
        uint256 requestId = aiVerifier.requestQuantumAIVerification(
            1, // content verification type
            80, // weight
            95, // purity
            verificationData
        );

        item.aiVerificationHash = bytes32(requestId);

        // Refund excess payment
        if (msg.value > VERIFICATION_FEE) {
            payable(msg.sender).transfer(msg.value - VERIFICATION_FEE);
        }
    }

    /**
     * @dev Submit verification result for content
     * @param contentHash Hash of the content
     * @param verificationResult Result from AI verification
     */
    function submitContentVerification(
        bytes32 contentHash,
        bool verificationResult
    ) external {
        ContentItem storage item = contentItems[contentHash];
        require(item.creator != address(0), "Content does not exist");
        require(!item.isVerified, "Content already verified");

        // Verify the AI verification result
        (bool verified, , , ) = aiVerifier.getVerificationResult(uint256(item.aiVerificationHash));
        require(verified, "AI verification not completed");

        item.isVerified = verificationResult;

        emit ContentVerified(contentHash, msg.sender);
    }

    /**
     * @dev Share content with another user
     * @param contentHash Hash of the content to share
     * @param recipient Address of the recipient
     * @param quantumAccessKey Quantum-resistant access key for the share
     * @param duration Duration of the share in seconds
     */
    function shareContent(
        bytes32 contentHash,
        address recipient,
        bytes32 quantumAccessKey,
        uint256 duration
    ) external payable nonReentrant {
        ContentItem storage item = contentItems[contentHash];
        require(item.creator == msg.sender, "Not content creator");
        require(duration <= MAX_SHARE_DURATION, "Share duration too long");

        // Pay sharing fee
        require(msg.value >= SHARING_FEE, "Insufficient sharing fee");

        bytes32 shareId = keccak256(abi.encodePacked(contentHash, recipient, block.timestamp));

        contentShares[shareId] = ContentShare({
            shareId: shareId,
            contentHash: contentHash,
            sharer: msg.sender,
            recipient: recipient,
            quantumAccessKey: quantumAccessKey,
            expirationTime: block.timestamp + duration,
            isActive: true
        });

        sharedContent[recipient].push(shareId);

        // Refund excess payment
        if (msg.value > SHARING_FEE) {
            payable(msg.sender).transfer(msg.value - SHARING_FEE);
        }

        emit ContentShared(shareId, contentHash, recipient);
    }

    /**
     * @dev Access shared content
     * @param shareId ID of the content share
     */
    function accessSharedContent(bytes32 shareId) external payable nonReentrant {
        ContentShare storage share = contentShares[shareId];
        require(share.recipient == msg.sender, "Not authorized recipient");
        require(share.isActive, "Share not active");
        require(block.timestamp <= share.expirationTime, "Share expired");

        ContentItem storage item = contentItems[share.contentHash];
        require(item.creator != address(0), "Content does not exist");

        // Pay access fee if required
        if (item.accessFee > 0) {
            require(msg.value >= item.accessFee, "Insufficient access fee");
            require(godToken.transferFrom(msg.sender, item.creator, item.accessFee), "Access fee transfer failed");
        }

        // Grant access
        item.hasAccess[msg.sender] = true;

        emit ContentAccessed(share.contentHash, msg.sender);

        // Refund excess payment
        if (msg.value > item.accessFee) {
            payable(msg.sender).transfer(msg.value - item.accessFee);
        }
    }

    /**
     * @dev Revoke content share
     * @param shareId ID of the share to revoke
     */
    function revokeContentShare(bytes32 shareId) external {
        ContentShare storage share = contentShares[shareId];
        require(share.sharer == msg.sender, "Not share owner");

        share.isActive = false;
    }

    /**
     * @dev Get content access information
     * @param contentHash Hash of the content
     * @param user Address to check access for
     */
    function getContentAccess(bytes32 contentHash, address user) external view returns (
        bool hasAccess,
        bool isVerified,
        bool isEncrypted,
        uint256 accessFee,
        address creator
    ) {
        ContentItem storage item = contentItems[contentHash];
        return (
            item.hasAccess[user] || item.creator == user,
            item.isVerified,
            item.isEncrypted,
            item.accessFee,
            item.creator
        );
    }

    /**
     * @dev Get user's content list
     * @param user Address of the user
     */
    function getUserContent(address user) external view returns (bytes32[] memory) {
        return userContent[user];
    }

    /**
     * @dev Get user's shared content
     * @param user Address of the user
     */
    function getSharedContent(address user) external view returns (bytes32[] memory) {
        return sharedContent[user];
    }

    /**
     * @dev Get content statistics
     */
    function getContentStats() external view returns (
        uint256 totalContent,
        uint256 verifiedContent,
        uint256 encryptedContent
    ) {
        // Simplified statistics - would need proper counting in production
        return (0, 0, 0);
    }

    /**
     * @dev Emergency content removal (only owner)
     * @param contentHash Hash of content to remove
     */
    function emergencyRemoveContent(bytes32 contentHash) external onlyOwner {
        ContentItem storage item = contentItems[contentHash];
        require(item.creator != address(0), "Content does not exist");

        // Remove from user's content list (simplified)
        delete contentItems[contentHash];
    }
}
