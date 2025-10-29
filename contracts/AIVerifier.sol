// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AIVerifier
 * @dev Smart contract interface for AI-embedded gold verification
 * Integrates with NOVA-BLOCKS quantum AI systems
 */
contract AIVerifier is Ownable, ReentrancyGuard {
    // Verification request structure
    struct VerificationRequest {
        address requester;
        uint256 metalType;       // 1 = Gold, 2 = Silver
        uint256 weight;          // Weight in grams
        uint256 purity;          // Purity percentage
        bytes32 sensorDataHash;  // Hash of AI sensor data
        uint256 timestamp;
        bool processed;
        bool approved;
        bytes32 verificationId;
    }

    mapping(bytes32 => VerificationRequest) public requests;
    mapping(address => bool) public authorizedVerifiers;

    uint256 public verificationFee = 0.01 ether;
    uint256 public requestCount;

    // Events
    event VerificationRequested(bytes32 indexed requestId, address indexed requester);
    event VerificationCompleted(bytes32 indexed requestId, bool approved);
    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);

    constructor() {
        authorizedVerifiers[msg.sender] = true;
    }

    /**
     * @dev Request AI verification for precious metal
     */
    function requestVerification(
        uint256 _metalType,
        uint256 _weight,
        uint256 _purity,
        bytes32 _sensorDataHash
    ) external payable nonReentrant returns (bytes32) {
        require(msg.value >= verificationFee, "Insufficient verification fee");
        require(_metalType == 1 || _metalType == 2, "Invalid metal type");
        require(_weight > 0, "Weight must be positive");
        require(_purity >= 900 && _purity <= 1000, "Invalid purity range");

        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender,
            _metalType,
            _weight,
            _purity,
            _sensorDataHash,
            block.timestamp,
            requestCount
        ));

        requests[requestId] = VerificationRequest({
            requester: msg.sender,
            metalType: _metalType,
            weight: _weight,
            purity: _purity,
            sensorDataHash: _sensorDataHash,
            timestamp: block.timestamp,
            processed: false,
            approved: false,
            verificationId: bytes32(0)
        });

        requestCount++;
        emit VerificationRequested(requestId, msg.sender);

        return requestId;
    }

    /**
     * @dev Submit AI verification result (only authorized verifiers)
     */
    function submitVerification(
        bytes32 _requestId,
        bool _approved,
        bytes32 _verificationId
    ) external {
        require(authorizedVerifiers[msg.sender], "Not authorized verifier");

        VerificationRequest storage request = requests[_requestId];
        require(!request.processed, "Request already processed");
        require(request.requester != address(0), "Request does not exist");

        request.processed = true;
        request.approved = _approved;
        request.verificationId = _verificationId;

        emit VerificationCompleted(_requestId, _approved);
    }

    /**
     * @dev Authorize a new AI verifier
     */
    function authorizeVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = true;
        emit VerifierAuthorized(_verifier);
    }

    /**
     * @dev Revoke verifier authorization
     */
    function revokeVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
        emit VerifierRevoked(_verifier);
    }

    /**
     * @dev Update verification fee
     */
    function setVerificationFee(uint256 _fee) external onlyOwner {
        verificationFee = _fee;
    }

    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Get verification request details
     */
    function getVerificationRequest(bytes32 _requestId) external view returns (
        address requester,
        uint256 metalType,
        uint256 weight,
        uint256 purity,
        bytes32 sensorDataHash,
        uint256 timestamp,
        bool processed,
        bool approved,
        bytes32 verificationId
    ) {
        VerificationRequest memory request = requests[_requestId];
        return (
            request.requester,
            request.metalType,
            request.weight,
            request.purity,
            request.sensorDataHash,
            request.timestamp,
            request.processed,
            request.approved,
            request.verificationId
        );
    }
}
