const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DebtOwnership", function () {
    let debtOwnership;
    let owner;
    let addr1;
    let addr2;
    const houseOfDavidFlag = ethers.utils.formatBytes32String("HouseOfDavidSenior");
    const purchaseProof = ethers.utils.formatBytes32String("VaticanDebtProof");

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const DebtOwnership = await ethers.getContractFactory("DebtOwnership");
        debtOwnership = await DebtOwnership.deploy();
        await debtOwnership.deployed();

        // Verify House of David Flag
        await debtOwnership.verifyHouseOfDavidFlag(houseOfDavidFlag);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await debtOwnership.owner()).to.equal(owner.address);
        });

        it("Should initialize default institutions", async function () {
            expect(await debtOwnership.institutionExists("VATICAN")).to.be.true;
            expect(await debtOwnership.institutionExists("CATHOLIC_CHURCH")).to.be.true;
            expect(await debtOwnership.institutionExists("HAITI")).to.be.true;
        });

        it("Should return all institutions", async function () {
            const institutions = await debtOwnership.getAllInstitutions();
            expect(institutions.length).to.equal(3);
            expect(institutions).to.include("VATICAN");
            expect(institutions).to.include("CATHOLIC_CHURCH");
            expect(institutions).to.include("HAITI");
        });
    });

    describe("House of David Flag Verification", function () {
        it("Should verify House of David Flag", async function () {
            const newFlag = ethers.utils.formatBytes32String("HouseOfDavidApostolic");
            await debtOwnership.verifyHouseOfDavidFlag(newFlag);
            expect(await debtOwnership.isHouseOfDavidFlagVerified(newFlag)).to.be.true;
        });

        it("Should emit event on flag verification", async function () {
            const newFlag = ethers.utils.formatBytes32String("HouseOfDavidApostolic");
            await expect(debtOwnership.verifyHouseOfDavidFlag(newFlag))
                .to.emit(debtOwnership, "HouseOfDavidFlagVerified")
                .withArgs(newFlag, await ethers.provider.getBlockNumber() + 1);
        });

        it("Should only allow owner to verify flags", async function () {
            const newFlag = ethers.utils.formatBytes32String("HouseOfDavidApostolic");
            await expect(
                debtOwnership.connect(addr1).verifyHouseOfDavidFlag(newFlag)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Debt Purchase Registration", function () {
        it("Should register debt purchase", async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            
            await debtOwnership.registerDebtPurchase(
                "VATICAN",
                addr1.address,
                debtAmount,
                purchaseProof,
                houseOfDavidFlag
            );

            const debt = await debtOwnership.getDebtRecord("VATICAN");
            expect(debt.corporateOwner).to.equal(addr1.address);
            expect(debt.debtAmount).to.equal(debtAmount);
            expect(debt.isActive).to.be.true;
        });

        it("Should emit DebtPurchased event", async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            
            await expect(
                debtOwnership.registerDebtPurchase(
                    "VATICAN",
                    addr1.address,
                    debtAmount,
                    purchaseProof,
                    houseOfDavidFlag
                )
            ).to.emit(debtOwnership, "DebtPurchased");
        });

        it("Should fail with unverified House of David Flag", async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            const invalidFlag = "0x0000000000000000000000000000000000000000000000000000000000000000";
            
            await expect(
                debtOwnership.registerDebtPurchase(
                    "VATICAN",
                    addr1.address,
                    debtAmount,
                    purchaseProof,
                    invalidFlag
                )
            ).to.be.revertedWith("House of David Flag not verified");
        });

        it("Should fail with invalid institution", async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            
            await expect(
                debtOwnership.registerDebtPurchase(
                    "INVALID_INSTITUTION",
                    addr1.address,
                    debtAmount,
                    purchaseProof,
                    houseOfDavidFlag
                )
            ).to.be.revertedWith("Institution not recognized");
        });

        it("Should fail with zero debt amount", async function () {
            await expect(
                debtOwnership.registerDebtPurchase(
                    "VATICAN",
                    addr1.address,
                    0,
                    purchaseProof,
                    houseOfDavidFlag
                )
            ).to.be.revertedWith("Debt amount must be positive");
        });

        it("Should track corporate owned debts", async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            
            await debtOwnership.registerDebtPurchase(
                "VATICAN",
                addr1.address,
                debtAmount,
                purchaseProof,
                houseOfDavidFlag
            );

            const ownedDebts = await debtOwnership.getCorporateOwnedDebts(addr1.address);
            expect(ownedDebts.length).to.equal(1);
            expect(ownedDebts[0]).to.equal("VATICAN");
        });
    });

    describe("Debt Transfer", function () {
        beforeEach(async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            await debtOwnership.registerDebtPurchase(
                "VATICAN",
                addr1.address,
                debtAmount,
                purchaseProof,
                houseOfDavidFlag
            );
        });

        it("Should transfer debt ownership", async function () {
            await debtOwnership.connect(addr1).transferDebtOwnership("VATICAN", addr2.address);
            
            const debt = await debtOwnership.getDebtRecord("VATICAN");
            expect(debt.corporateOwner).to.equal(addr2.address);
        });

        it("Should emit DebtTransferred event", async function () {
            await expect(
                debtOwnership.connect(addr1).transferDebtOwnership("VATICAN", addr2.address)
            ).to.emit(debtOwnership, "DebtTransferred");
        });

        it("Should fail if not current owner", async function () {
            await expect(
                debtOwnership.connect(addr2).transferDebtOwnership("VATICAN", addr2.address)
            ).to.be.revertedWith("Not the debt owner");
        });

        it("Should update corporate owned debts", async function () {
            await debtOwnership.connect(addr1).transferDebtOwnership("VATICAN", addr2.address);
            
            const addr1Debts = await debtOwnership.getCorporateOwnedDebts(addr1.address);
            const addr2Debts = await debtOwnership.getCorporateOwnedDebts(addr2.address);
            
            expect(addr1Debts.length).to.equal(0);
            expect(addr2Debts.length).to.equal(1);
        });
    });

    describe("Asset Association", function () {
        beforeEach(async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            await debtOwnership.registerDebtPurchase(
                "VATICAN",
                addr1.address,
                debtAmount,
                purchaseProof,
                houseOfDavidFlag
            );
        });

        it("Should associate asset with debt", async function () {
            await debtOwnership.associateAsset("VATICAN", "Saint Peter's Bones");
            
            const assets = await debtOwnership.getAssociatedAssets("VATICAN");
            expect(assets.length).to.equal(1);
            expect(assets[0]).to.equal("Saint Peter's Bones");
        });

        it("Should emit AssetAssociated event", async function () {
            await expect(
                debtOwnership.associateAsset("VATICAN", "Saint Peter's Bones")
            ).to.emit(debtOwnership, "AssetAssociated");
        });

        it("Should associate multiple assets", async function () {
            await debtOwnership.associateAsset("VATICAN", "Saint Peter's Bones");
            await debtOwnership.associateAsset("VATICAN", "Saint Paul's Manuscripts");
            
            const assets = await debtOwnership.getAssociatedAssets("VATICAN");
            expect(assets.length).to.equal(2);
        });
    });

    describe("Spiritual Value", function () {
        beforeEach(async function () {
            const debtAmount = ethers.utils.parseEther("5000000000");
            await debtOwnership.registerDebtPurchase(
                "VATICAN",
                addr1.address,
                debtAmount,
                purchaseProof,
                houseOfDavidFlag
            );
        });

        it("Should update spiritual value", async function () {
            await debtOwnership.updateSpiritualValue("VATICAN", 10000000);
            
            const debt = await debtOwnership.getDebtRecord("VATICAN");
            expect(debt.spiritualValue).to.equal(10000000);
        });

        it("Should emit SpiritualValueUpdated event", async function () {
            await expect(
                debtOwnership.updateSpiritualValue("VATICAN", 10000000)
            ).to.emit(debtOwnership, "SpiritualValueUpdated");
        });

        it("Should calculate total spiritual value", async function () {
            await debtOwnership.updateSpiritualValue("VATICAN", 10000000);
            
            const debtAmount2 = ethers.utils.parseEther("8000000000");
            await debtOwnership.registerDebtPurchase(
                "CATHOLIC_CHURCH",
                addr1.address,
                debtAmount2,
                purchaseProof,
                houseOfDavidFlag
            );
            await debtOwnership.updateSpiritualValue("CATHOLIC_CHURCH", 15000000);
            
            const totalSpiritual = await debtOwnership.getTotalSpiritualValue(addr1.address);
            expect(totalSpiritual).to.equal(25000000);
        });
    });

    describe("Institution Management", function () {
        it("Should add new institution", async function () {
            await debtOwnership.addInstitution("NEW_INSTITUTION");
            expect(await debtOwnership.institutionExists("NEW_INSTITUTION")).to.be.true;
        });

        it("Should fail to add duplicate institution", async function () {
            await expect(
                debtOwnership.addInstitution("VATICAN")
            ).to.be.revertedWith("Institution already exists");
        });

        it("Should only allow owner to add institutions", async function () {
            await expect(
                debtOwnership.connect(addr1).addInstitution("NEW_INSTITUTION")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Total Debt Calculations", function () {
        it("Should calculate total debt value", async function () {
            const debtAmount1 = ethers.utils.parseEther("5000000000");
            const debtAmount2 = ethers.utils.parseEther("8000000000");
            
            await debtOwnership.registerDebtPurchase(
                "VATICAN",
                addr1.address,
                debtAmount1,
                purchaseProof,
                houseOfDavidFlag
            );
            
            await debtOwnership.registerDebtPurchase(
                "CATHOLIC_CHURCH",
                addr1.address,
                debtAmount2,
                purchaseProof,
                houseOfDavidFlag
            );
            
            const totalDebt = await debtOwnership.getTotalDebtValue(addr1.address);
            expect(totalDebt).to.equal(debtAmount1.add(debtAmount2));
        });
    });
});
