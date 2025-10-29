// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title GodNFT
 * @dev ERC-721 NFT certificates for precious metal ownership
 * Represents physical gold/silver certificates backed by AI verification
 */
contract GodNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // NFT metadata
    struct MetalCertificate {
        uint256 metalType;       // 1 = Gold, 2 = Silver
        uint256 weight;          // Weight in grams
        uint256 purity;          // Purity in percentage (999 = 99.9%)
        string serialNumber;     // Unique serial number
        uint256 mintDate;        // Timestamp of minting
        bytes32 aiVerification;  // AI verification hash
        bool redeemed;           // Whether certificate has been redeemed
    }

    mapping(uint256 => MetalCertificate) public certificates;

    // Events
    event CertificateMinted(uint256 indexed tokenId, address indexed owner, uint256 metalType, uint256 weight);
    event CertificateRedeemed(uint256 indexed tokenId, address indexed redeemer);

    constructor() ERC721("GOD Precious Metal Certificate", "GODNFT") {}

    /**
     * @dev Mint a new precious metal certificate NFT
     */
    function mintCertificate(
        address _to,
        uint256 _metalType,
        uint256 _weight,
        uint256 _purity,
        string memory _serialNumber,
        bytes32 _aiVerification
    ) external onlyOwner returns (uint256) {
        require(_metalType == 1 || _metalType == 2, "Invalid metal type");
        require(_weight > 0, "Weight must be positive");
        require(_purity >= 900 && _purity <= 1000, "Invalid purity");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        certificates[tokenId] = MetalCertificate({
            metalType: _metalType,
            weight: _weight,
            purity: _purity,
            serialNumber: _serialNumber,
            mintDate: block.timestamp,
            aiVerification: _aiVerification,
            redeemed: false
        });

        _mint(_to, tokenId);

        emit CertificateMinted(tokenId, _to, _metalType, _weight);
        return tokenId;
    }

    /**
     * @dev Redeem a certificate (burn NFT and trigger physical delivery)
     */
    function redeemCertificate(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(!certificates[_tokenId].redeemed, "Already redeemed");

        certificates[_tokenId].redeemed = true;

        // Burn the NFT
        _burn(_tokenId);

        emit CertificateRedeemed(_tokenId, msg.sender);
    }

    /**
     * @dev Get certificate details
     */
    function getCertificate(uint256 _tokenId) external view returns (
        uint256 metalType,
        uint256 weight,
        uint256 purity,
        string memory serialNumber,
        uint256 mintDate,
        bytes32 aiVerification,
        bool redeemed
    ) {
        MetalCertificate memory cert = certificates[_tokenId];
        return (
            cert.metalType,
            cert.weight,
            cert.purity,
            cert.serialNumber,
            cert.mintDate,
            cert.aiVerification,
            cert.redeemed
        );
    }

    /**
     * @dev Get token URI for metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        MetalCertificate memory cert = certificates[tokenId];
        string memory metalName = cert.metalType == 1 ? "Gold" : "Silver";

        // In a real implementation, this would return IPFS/Arweave metadata
        return string(abi.encodePacked(
            "https://api.god-token-coin.com/metadata/",
            Strings.toString(tokenId),
            "?metal=",
            metalName,
            "&weight=",
            Strings.toString(cert.weight),
            "&purity=",
            Strings.toString(cert.purity)
        ));
    }
}
