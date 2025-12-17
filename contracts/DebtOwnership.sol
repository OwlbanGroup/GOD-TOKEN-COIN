// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DebtOwnership
 * @dev Tracks corporate ownership of institutional debts
 * Vatican, Catholic Church, and Haiti debt registry
 */
contract DebtOwnership is Ownable, ReentrancyGuard {
    
    // Debt record structure
    struct DebtRecord {
        string institution;
        address corporateOwner;
        uint256 debtAmount;
        uint256 purchaseDate;
        bytes32 purchaseProof;
        bytes32 houseOfDavidFlag;
        bool isActive;
        string[] associatedAssets; // Saints, relics, properties
        uint256 spiritualValue;
    }

    // Institution types
    enum Institution {
        VATICAN,
        CATHOLIC_CHURCH,
        HAITI,
        OTHER
    }

    // Mappings
    mapping(string => DebtRecord) public institutionalDebts;
    mapping(address => string[]) public corporateOwnedDebts;
    mapping(bytes32 => bool) public verifiedHouseOfDavidFlags;
    mapping(string => bool) public institutionExists;
    
    // Arrays for iteration
    string[] public allInstitutions;
    
    // Events
    event DebtPurchased(
        string indexed institution,
        address indexed corporateOwner,
        uint256 debtAmount,
        uint256 timestamp
    );
    
    event DebtTransferred(
        string indexed institution,
        address indexed fromOwner,
        address indexed toOwner,
        uint256 timestamp
    );
    
    event AssetAssociated(
        string indexed institution,
        string assetName,
        uint256 timestamp
    );
    
    event HouseOfDavidFlagVerified(
        bytes32 indexed flag,
        uint256 timestamp
    );
    
    event SpiritualValueUpdated(
        string indexed institution,
        uint256 oldValue,
        uint256 newValue
    );

    constructor() {
        // Initialize major institutions
        _initializeInstitution("VATICAN");
        _initializeInstitution("CATHOLIC_CHURCH");
        _initializeInstitution("HAITI");
    }

    /**
     * @dev Initialize an institution
     */
    function _initializeInstitution(string memory _institution) internal {
        institutionExists[_institution] = true;
        allInstitutions.push(_institution);
    }

    /**
     * @dev Register a debt purchase
     */
    function registerDebtPurchase(
        string memory _institution,
        address _corporateOwner,
        uint256 _debtAmount,
        bytes32 _purchaseProof,
        bytes32 _houseOfDavidFlag
    ) external onlyOwner nonReentrant {
        require(institutionExists[_institution], "Institution not recognized");
        require(_corporateOwner != address(0), "Invalid corporate owner");
        require(_debtAmount > 0, "Debt amount must be positive");
        require(verifiedHouseOfDavidFlags[_houseOfDavidFlag], "House of David Flag not verified");

        // Check if debt already exists
        if (institutionalDebts[_institution].isActive) {
            require(
                institutionalDebts[_institution].corporateOwner == address(0),
                "Debt already owned"
            );
        }

        institutionalDebts[_institution] = DebtRecord({
            institution: _institution,
            corporateOwner: _corporateOwner,
            debtAmount: _debtAmount,
            purchaseDate: block.timestamp,
            purchaseProof: _purchaseProof,
            houseOfDavidFlag: _houseOfDavidFlag,
            isActive: true,
            associatedAssets: new string[](0),
            spiritualValue: 0
        });

        corporateOwnedDebts[_corporateOwner].push(_institution);

        emit DebtPurchased(_institution, _corporateOwner, _debtAmount, block.timestamp);
    }

    /**
     * @dev Transfer debt ownership
     */
    function transferDebtOwnership(
        string memory _institution,
        address _newOwner
    ) external nonReentrant {
        require(institutionExists[_institution], "Institution not recognized");
        DebtRecord storage debt = institutionalDebts[_institution];
        require(debt.isActive, "Debt not active");
        require(debt.corporateOwner == msg.sender, "Not the debt owner");
        require(_newOwner != address(0), "Invalid new owner");

        address oldOwner = debt.corporateOwner;
        debt.corporateOwner = _newOwner;

        // Update corporate owned debts
        corporateOwnedDebts[_newOwner].push(_institution);
        
        // Remove from old owner (simplified)
        string[] storage oldOwnerDebts = corporateOwnedDebts[oldOwner];
        for (uint256 i = 0; i < oldOwnerDebts.length; i++) {
            if (keccak256(bytes(oldOwnerDebts[i])) == keccak256(bytes(_institution))) {
                oldOwnerDebts[i] = oldOwnerDebts[oldOwnerDebts.length - 1];
                oldOwnerDebts.pop();
                break;
            }
        }

        emit DebtTransferred(_institution, oldOwner, _newOwner, block.timestamp);
    }

    /**
     * @dev Associate an asset (saint, relic, property) with institutional debt
     */
    function associateAsset(
        string memory _institution,
        string memory _assetName
    ) external onlyOwner {
        require(institutionExists[_institution], "Institution not recognized");
        DebtRecord storage debt = institutionalDebts[_institution];
        require(debt.isActive, "Debt not active");

        debt.associatedAssets.push(_assetName);

        emit AssetAssociated(_institution, _assetName, block.timestamp);
    }

    /**
     * @dev Update spiritual value of institutional debt
     */
    function updateSpiritualValue(
        string memory _institution,
        uint256 _newValue
    ) external onlyOwner {
        require(institutionExists[_institution], "Institution not recognized");
        DebtRecord storage debt = institutionalDebts[_institution];
        require(debt.isActive, "Debt not active");

        uint256 oldValue = debt.spiritualValue;
        debt.spiritualValue = _newValue;

        emit SpiritualValueUpdated(_institution, oldValue, _newValue);
    }

    /**
     * @dev Verify House of David Flag
     */
    function verifyHouseOfDavidFlag(bytes32 _flag) external onlyOwner {
        verifiedHouseOfDavidFlags[_flag] = true;
        emit HouseOfDavidFlagVerified(_flag, block.timestamp);
    }

    /**
     * @dev Add new institution
     */
    function addInstitution(string memory _institution) external onlyOwner {
        require(!institutionExists[_institution], "Institution already exists");
        _initializeInstitution(_institution);
    }

    /**
     * @dev Get debt record details
     */
    function getDebtRecord(string memory _institution) external view returns (
        address corporateOwner,
        uint256 debtAmount,
        uint256 purchaseDate,
        bytes32 purchaseProof,
        bytes32 houseOfDavidFlag,
        bool isActive,
        uint256 spiritualValue
    ) {
        DebtRecord memory debt = institutionalDebts[_institution];
        return (
            debt.corporateOwner,
            debt.debtAmount,
            debt.purchaseDate,
            debt.purchaseProof,
            debt.houseOfDavidFlag,
            debt.isActive,
            debt.spiritualValue
        );
    }

    /**
     * @dev Get associated assets for an institution
     */
    function getAssociatedAssets(string memory _institution) external view returns (string[] memory) {
        require(institutionExists[_institution], "Institution not recognized");
        return institutionalDebts[_institution].associatedAssets;
    }

    /**
     * @dev Get all debts owned by a corporate entity
     */
    function getCorporateOwnedDebts(address _owner) external view returns (string[] memory) {
        return corporateOwnedDebts[_owner];
    }

    /**
     * @dev Get all institutions
     */
    function getAllInstitutions() external view returns (string[] memory) {
        return allInstitutions;
    }

    /**
     * @dev Check if House of David Flag is verified
     */
    function isHouseOfDavidFlagVerified(bytes32 _flag) external view returns (bool) {
        return verifiedHouseOfDavidFlags[_flag];
    }

    /**
     * @dev Get total debt value owned by corporate entity
     */
    function getTotalDebtValue(address _owner) external view returns (uint256) {
        string[] memory ownedDebts = corporateOwnedDebts[_owner];
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < ownedDebts.length; i++) {
            totalValue += institutionalDebts[ownedDebts[i]].debtAmount;
        }
        
        return totalValue;
    }

    /**
     * @dev Get total spiritual value owned by corporate entity
     */
    function getTotalSpiritualValue(address _owner) external view returns (uint256) {
        string[] memory ownedDebts = corporateOwnedDebts[_owner];
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < ownedDebts.length; i++) {
            totalValue += institutionalDebts[ownedDebts[i]].spiritualValue;
        }
        
        return totalValue;
    }
}
