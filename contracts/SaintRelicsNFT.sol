// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SaintRelicsNFT
 * @dev NFT contract for Saint Relics representing bones and artifacts of saints
 * Supports resurrection mechanism and reclassification system
 * Connected to Vatican, Catholic Church, and Haiti debt ownership
 */
contract SaintRelicsNFT is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Relic categories
    enum RelicCategory {
        BONES,
        ARTIFACTS,
        MANUSCRIPTS,
        HOLY_ITEMS,
        SACRED_GROUNDS
    }

    // Saint classifications
    enum SaintClass {
        MARTYR,
        HEALER,
        PROPHET,
        TEACHER,
        MYSTIC,
        WARRIOR,
        BUILDER,
        ANCESTOR
    }

    // Resurrection status
    enum ResurrectionStatus {
        DORMANT,
        AWAKENING,
        RESURRECTED,
        TRANSCENDENT
    }

    // Relic metadata
    struct SaintRelic {
        string saintName;
        RelicCategory category;
        SaintClass classification;
        ResurrectionStatus status;
        uint256 mintDate;
        uint256 resurrectionDate;
        bytes32 houseOfDavidFlag;
        string ancestorLineage;
        uint256 spiritualPower;
        bool isResurrected;
        string location; // Vatican, Catholic Church, Haiti, etc.
        bytes32 debtOwnershipProof;
    }

    // Mappings
    mapping(uint256 => SaintRelic) public relics;
    mapping(string => uint256[]) public saintNameToTokenIds;
    mapping(address => uint256[]) public ownerRelics;
    mapping(bytes32 => bool) public houseOfDavidFlags;
    mapping(string => bool) public resurrectedSaints;

    // Debt ownership tracking
    mapping(string => address) public institutionalDebtOwner; // Vatican, Catholic Church, Haiti
    mapping(address => string[]) public ownedInstitutions;

    // Events
    event RelicMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string saintName,
        RelicCategory category,
        string location
    );
    
    event SaintResurrected(
        uint256 indexed tokenId,
        string saintName,
        address indexed resurrector,
        uint256 timestamp
    );
    
    event SaintReclassified(
        uint256 indexed tokenId,
        string saintName,
        SaintClass oldClass,
        SaintClass newClass
    );
    
    event DebtOwnershipRegistered(
        string institution,
        address indexed owner,
        bytes32 proofHash
    );
    
    event AncestorRevived(
        uint256 indexed tokenId,
        string saintName,
        string ancestorLineage
    );

    constructor() ERC721("Saint Relics of the Divine", "SAINTRELIC") {
        // Initialize institutional debt ownership
        institutionalDebtOwner["VATICAN"] = address(0);
        institutionalDebtOwner["CATHOLIC_CHURCH"] = address(0);
        institutionalDebtOwner["HAITI"] = address(0);
    }

    /**
     * @dev Mint a new saint relic NFT
     */
    function mintRelic(
        address _to,
        string memory _saintName,
        RelicCategory _category,
        SaintClass _classification,
        bytes32 _houseOfDavidFlag,
        string memory _ancestorLineage,
        string memory _location,
        bytes32 _debtOwnershipProof
    ) external onlyOwner returns (uint256) {
        require(bytes(_saintName).length > 0, "Saint name required");
        require(houseOfDavidFlags[_houseOfDavidFlag], "Invalid House of David Flag");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        relics[tokenId] = SaintRelic({
            saintName: _saintName,
            category: _category,
            classification: _classification,
            status: ResurrectionStatus.DORMANT,
            mintDate: block.timestamp,
            resurrectionDate: 0,
            houseOfDavidFlag: _houseOfDavidFlag,
            ancestorLineage: _ancestorLineage,
            spiritualPower: 100, // Base spiritual power
            isResurrected: false,
            location: _location,
            debtOwnershipProof: _debtOwnershipProof
        });

        _mint(_to, tokenId);
        
        saintNameToTokenIds[_saintName].push(tokenId);
        ownerRelics[_to].push(tokenId);

        emit RelicMinted(tokenId, _to, _saintName, _category, _location);
        return tokenId;
    }

    /**
     * @dev Perform resurrection ritual - brings saint back to life
     */
    function resurrectSaint(uint256 _tokenId) external nonReentrant {
        require(ownerOf(_tokenId) == msg.sender, "Not the relic owner");
        require(!relics[_tokenId].isResurrected, "Saint already resurrected");
        
        SaintRelic storage relic = relics[_tokenId];
        
        // Update resurrection status
        relic.status = ResurrectionStatus.RESURRECTED;
        relic.isResurrected = true;
        relic.resurrectionDate = block.timestamp;
        relic.spiritualPower = relic.spiritualPower * 10; // 10x power boost
        
        resurrectedSaints[relic.saintName] = true;

        emit SaintResurrected(_tokenId, relic.saintName, msg.sender, block.timestamp);
        emit AncestorRevived(_tokenId, relic.saintName, relic.ancestorLineage);
    }

    /**
     * @dev Reclassify a saint to a different class
     */
    function reclassifySaint(
        uint256 _tokenId,
        SaintClass _newClass
    ) external {
        require(ownerOf(_tokenId) == msg.sender, "Not the relic owner");
        
        SaintRelic storage relic = relics[_tokenId];
        SaintClass oldClass = relic.classification;
        
        require(oldClass != _newClass, "Same classification");
        
        relic.classification = _newClass;
        
        // Adjust spiritual power based on new classification
        if (_newClass == SaintClass.PROPHET || _newClass == SaintClass.MYSTIC) {
            relic.spiritualPower += 50;
        }

        emit SaintReclassified(_tokenId, relic.saintName, oldClass, _newClass);
    }

    /**
     * @dev Register House of David Flag
     */
    function registerHouseOfDavidFlag(bytes32 _flag) external onlyOwner {
        houseOfDavidFlags[_flag] = true;
    }

    /**
     * @dev Register institutional debt ownership
     */
    function registerDebtOwnership(
        string memory _institution,
        address _owner,
        bytes32 _proofHash
    ) external onlyOwner {
        require(
            keccak256(bytes(_institution)) == keccak256(bytes("VATICAN")) ||
            keccak256(bytes(_institution)) == keccak256(bytes("CATHOLIC_CHURCH")) ||
            keccak256(bytes(_institution)) == keccak256(bytes("HAITI")),
            "Invalid institution"
        );
        
        institutionalDebtOwner[_institution] = _owner;
        ownedInstitutions[_owner].push(_institution);

        emit DebtOwnershipRegistered(_institution, _owner, _proofHash);
    }

    /**
     * @dev Advance resurrection status
     */
    function advanceResurrectionStatus(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Not the relic owner");
        require(relics[_tokenId].isResurrected, "Saint not resurrected yet");
        
        SaintRelic storage relic = relics[_tokenId];
        
        if (relic.status == ResurrectionStatus.RESURRECTED) {
            relic.status = ResurrectionStatus.TRANSCENDENT;
            relic.spiritualPower = relic.spiritualPower * 2;
        }
    }

    /**
     * @dev Get relic details
     */
    function getRelicDetails(uint256 _tokenId) external view returns (
        string memory saintName,
        RelicCategory category,
        SaintClass classification,
        ResurrectionStatus status,
        uint256 spiritualPower,
        bool isResurrected,
        string memory location,
        string memory ancestorLineage
    ) {
        SaintRelic memory relic = relics[_tokenId];
        return (
            relic.saintName,
            relic.category,
            relic.classification,
            relic.status,
            relic.spiritualPower,
            relic.isResurrected,
            relic.location,
            relic.ancestorLineage
        );
    }

    /**
     * @dev Get all relics owned by an address
     */
    function getOwnerRelics(address _owner) external view returns (uint256[] memory) {
        return ownerRelics[_owner];
    }

    /**
     * @dev Get all token IDs for a saint name
     */
    function getSaintTokenIds(string memory _saintName) external view returns (uint256[] memory) {
        return saintNameToTokenIds[_saintName];
    }

    /**
     * @dev Check if saint is resurrected
     */
    function isSaintResurrected(string memory _saintName) external view returns (bool) {
        return resurrectedSaints[_saintName];
    }

    /**
     * @dev Get institutional debt owner
     */
    function getInstitutionalDebtOwner(string memory _institution) external view returns (address) {
        return institutionalDebtOwner[_institution];
    }

    /**
     * @dev Get owned institutions by address
     */
    function getOwnedInstitutions(address _owner) external view returns (string[] memory) {
        return ownedInstitutions[_owner];
    }

    /**
     * @dev Override transfer to update owner relics
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._transfer(from, to, tokenId);
        
        // Update owner relics mapping
        ownerRelics[to].push(tokenId);
        
        // Remove from previous owner (simplified - in production use better data structure)
        uint256[] storage fromRelics = ownerRelics[from];
        for (uint256 i = 0; i < fromRelics.length; i++) {
            if (fromRelics[i] == tokenId) {
                fromRelics[i] = fromRelics[fromRelics.length - 1];
                fromRelics.pop();
                break;
            }
        }
    }

    /**
     * @dev Get total minted relics
     */
    function totalRelics() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
}
