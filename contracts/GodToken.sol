// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GodToken
 * @dev ERC-20 token backed by precious metals (gold/silver) with AI verification
 * GOD COIN - The Galactic Quantum Blockchain Token
 */
contract GodToken is ERC20, Ownable, ReentrancyGuard {
    // Precious metal backing
    struct MetalReserve {
        uint256 goldOunces;      // Gold reserves in ounces
        uint256 silverOunces;    // Silver reserves in ounces
        uint256 totalValue;      // Total USD value
        uint256 lastAudit;       // Timestamp of last AI audit
    }

    MetalReserve public reserves;

    // Minting and burning
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public constant MIN_MINT_AMOUNT = 1 * 10**18; // 1 token minimum
    uint256 public constant METAL_BACKING_RATIO = 100; // 1 token = $100 worth of metal

    // AI verification
    address public aiVerifier;
    mapping(bytes32 => bool) public verifiedMints;

    // Events
    event MetalReserveUpdated(uint256 goldOunces, uint256 silverOunces, uint256 totalValue);
    event TokensMinted(address indexed to, uint256 amount, bytes32 verificationId);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(address _aiVerifier) ERC20("GOD Token", "GOD") {
        aiVerifier = _aiVerifier;
        _mint(msg.sender, 1000000 * 10**18); // Initial supply for liquidity
    }

    /**
     * @dev Update precious metal reserves (only owner)
     */
    function updateReserves(
        uint256 _goldOunces,
        uint256 _silverOunces,
        uint256 _totalValue
    ) external onlyOwner {
        reserves = MetalReserve({
            goldOunces: _goldOunces,
            silverOunces: _silverOunces,
            totalValue: _totalValue,
            lastAudit: block.timestamp
        });

        emit MetalReserveUpdated(_goldOunces, _silverOunces, _totalValue);
    }

    /**
     * @dev Mint tokens backed by AI-verified precious metals
     */
    function mintWithVerification(
        address _to,
        uint256 _amount,
        bytes32 _verificationId
    ) external nonReentrant {
        require(msg.sender == aiVerifier, "Only AI verifier can mint");
        require(_amount >= MIN_MINT_AMOUNT, "Amount too small");
        require(totalSupply() + _amount <= MAX_SUPPLY, "Exceeds max supply");
        require(!verifiedMints[_verificationId], "Verification ID already used");

        // Verify metal backing
        uint256 requiredValue = (_amount * METAL_BACKING_RATIO) / 10**18;
        require(reserves.totalValue >= requiredValue, "Insufficient metal reserves");

        verifiedMints[_verificationId] = true;
        _mint(_to, _amount);

        emit TokensMinted(_to, _amount, _verificationId);
    }

    /**
     * @dev Burn tokens to redeem precious metals
     */
    function burn(uint256 _amount) external nonReentrant {
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");

        _burn(msg.sender, _amount);

        // Update reserves (simplified - in reality would trigger physical redemption)
        uint256 redeemedValue = (_amount * METAL_BACKING_RATIO) / 10**18;
        reserves.totalValue -= redeemedValue;

        emit TokensBurned(msg.sender, _amount);
    }

    /**
     * @dev Get current metal backing ratio
     */
    function getMetalBackingRatio() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (reserves.totalValue * 10**18) / totalSupply();
    }

    /**
     * @dev Update AI verifier address
     */
    function setAIVerifier(address _newVerifier) external onlyOwner {
        aiVerifier = _newVerifier;
    }
}
