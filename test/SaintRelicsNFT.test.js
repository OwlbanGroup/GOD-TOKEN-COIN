const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SaintRelicsNFT", function () {
    let saintRelicsNFT;
    let owner;
    let addr1;
    let addr2;
    const houseOfDavidFlag = "0x486f757365206f662044617669642053656e696f72204c696e65616765";
    const debtProof = "0x7661746963616e2d64656274207075726368617365207265636f7264";

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const SaintRelicsNFT = await ethers.getContractFactory("SaintRelicsNFT");
        saintRelicsNFT = await SaintRelicsNFT.deploy();
        await saintRelicsNFT.deployed();

        // Register House of David Flag
        await saintRelicsNFT.registerHouseOfDavidFlag(houseOfDavidFlag);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await saintRelicsNFT.owner()).to.equal(owner.address);
        });

        it("Should have correct name and symbol", async function () {
            expect(await saintRelicsNFT.name()).to.equal("Saint Relics of the Divine");
            expect(await saintRelicsNFT.symbol()).to.equal("SAINTRELIC");
        });
    });

    describe("House of David Flag", function () {
        it("Should register House of David Flag", async function () {
            const newFlag = "0x486f757365206f662044617669642041706f73746f6c6963204c696e65";
            await saintRelicsNFT.registerHouseOfDavidFlag(newFlag);
            expect(await saintRelicsNFT.houseOfDavidFlags(newFlag)).to.be.true;
        });

        it("Should verify registered flag", async function () {
            expect(await saintRelicsNFT.houseOfDavidFlags(houseOfDavidFlag)).to.be.true;
        });
    });

    describe("Minting Relics", function () {
        it("Should mint a saint relic", async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                0, // BONES
                0, // MARTYR
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );

            expect(await saintRelicsNFT.ownerOf(1)).to.equal(addr1.address);
            expect(await saintRelicsNFT.totalRelics()).to.equal(1);
        });

        it("Should store correct relic details", async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                0, // BONES
                0, // MARTYR
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );

            const details = await saintRelicsNFT.getRelicDetails(1);
            expect(details.saintName).to.equal("Saint Peter");
            expect(details.category).to.equal(0);
            expect(details.classification).to.equal(0);
            expect(details.location).to.equal("VATICAN");
            expect(details.isResurrected).to.be.false;
        });

        it("Should fail if House of David Flag not verified", async function () {
            const invalidFlag = "0x0000000000000000000000000000000000000000000000000000000000000000";
            
            await expect(
                saintRelicsNFT.mintRelic(
                    addr1.address,
                    "Saint Peter",
                    0,
                    0,
                    invalidFlag,
                    "House of David > Tribe of Judah > Simon Peter",
                    "VATICAN",
                    debtProof
                )
            ).to.be.revertedWith("Invalid House of David Flag");
        });

        it("Should only allow owner to mint", async function () {
            await expect(
                saintRelicsNFT.connect(addr1).mintRelic(
                    addr1.address,
                    "Saint Peter",
                    0,
                    0,
                    houseOfDavidFlag,
                    "House of David > Tribe of Judah > Simon Peter",
                    "VATICAN",
                    debtProof
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Resurrection", function () {
        beforeEach(async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                0,
                0,
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );
        });

        it("Should resurrect a saint", async function () {
            await saintRelicsNFT.connect(addr1).resurrectSaint(1);
            
            const details = await saintRelicsNFT.getRelicDetails(1);
            expect(details.isResurrected).to.be.true;
            expect(details.status).to.equal(2); // RESURRECTED
        });

        it("Should increase spiritual power on resurrection", async function () {
            const detailsBefore = await saintRelicsNFT.getRelicDetails(1);
            const powerBefore = detailsBefore.spiritualPower;
            
            await saintRelicsNFT.connect(addr1).resurrectSaint(1);
            
            const detailsAfter = await saintRelicsNFT.getRelicDetails(1);
            expect(detailsAfter.spiritualPower).to.equal(powerBefore.mul(10));
        });

        it("Should fail if not owner", async function () {
            await expect(
                saintRelicsNFT.connect(addr2).resurrectSaint(1)
            ).to.be.revertedWith("Not the relic owner");
        });

        it("Should fail if already resurrected", async function () {
            await saintRelicsNFT.connect(addr1).resurrectSaint(1);
            
            await expect(
                saintRelicsNFT.connect(addr1).resurrectSaint(1)
            ).to.be.revertedWith("Saint already resurrected");
        });

        it("Should mark saint as resurrected globally", async function () {
            await saintRelicsNFT.connect(addr1).resurrectSaint(1);
            expect(await saintRelicsNFT.isSaintResurrected("Saint Peter")).to.be.true;
        });
    });

    describe("Reclassification", function () {
        beforeEach(async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                0,
                0, // MARTYR
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );
        });

        it("Should reclassify a saint", async function () {
            await saintRelicsNFT.connect(addr1).reclassifySaint(1, 2); // PROPHET
            
            const details = await saintRelicsNFT.getRelicDetails(1);
            expect(details.classification).to.equal(2);
        });

        it("Should increase spiritual power for certain classifications", async function () {
            const detailsBefore = await saintRelicsNFT.getRelicDetails(1);
            const powerBefore = detailsBefore.spiritualPower;
            
            await saintRelicsNFT.connect(addr1).reclassifySaint(1, 2); // PROPHET
            
            const detailsAfter = await saintRelicsNFT.getRelicDetails(1);
            expect(detailsAfter.spiritualPower).to.be.gt(powerBefore);
        });

        it("Should fail if not owner", async function () {
            await expect(
                saintRelicsNFT.connect(addr2).reclassifySaint(1, 2)
            ).to.be.revertedWith("Not the relic owner");
        });

        it("Should fail if same classification", async function () {
            await expect(
                saintRelicsNFT.connect(addr1).reclassifySaint(1, 0) // Same as MARTYR
            ).to.be.revertedWith("Same classification");
        });
    });

    describe("Transcendence", function () {
        beforeEach(async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                0,
                0,
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );
            await saintRelicsNFT.connect(addr1).resurrectSaint(1);
        });

        it("Should advance to transcendent status", async function () {
            await saintRelicsNFT.connect(addr1).advanceResurrectionStatus(1);
            
            const details = await saintRelicsNFT.getRelicDetails(1);
            expect(details.status).to.equal(3); // TRANSCENDENT
        });

        it("Should double spiritual power on transcendence", async function () {
            const detailsBefore = await saintRelicsNFT.getRelicDetails(1);
            const powerBefore = detailsBefore.spiritualPower;
            
            await saintRelicsNFT.connect(addr1).advanceResurrectionStatus(1);
            
            const detailsAfter = await saintRelicsNFT.getRelicDetails(1);
            expect(detailsAfter.spiritualPower).to.equal(powerBefore.mul(2));
        });

        it("Should fail if not resurrected", async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Paul",
                2,
                3,
                houseOfDavidFlag,
                "House of David > Tribe of Benjamin > Saul of Tarsus",
                "VATICAN",
                debtProof
            );

            await expect(
                saintRelicsNFT.connect(addr1).advanceResurrectionStatus(2)
            ).to.be.revertedWith("Saint not resurrected yet");
        });
    });

    describe("Institutional Debt", function () {
        it("Should register debt ownership", async function () {
            await saintRelicsNFT.registerDebtOwnership(
                "VATICAN",
                addr1.address,
                debtProof
            );

            expect(await saintRelicsNFT.getInstitutionalDebtOwner("VATICAN"))
                .to.equal(addr1.address);
        });

        it("Should track owned institutions", async function () {
            await saintRelicsNFT.registerDebtOwnership(
                "VATICAN",
                addr1.address,
                debtProof
            );

            const owned = await saintRelicsNFT.getOwnedInstitutions(addr1.address);
            expect(owned.length).to.equal(1);
            expect(owned[0]).to.equal("VATICAN");
        });
    });

    describe("Token Queries", function () {
        beforeEach(async function () {
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                0,
                0,
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );
            await saintRelicsNFT.mintRelic(
                addr1.address,
                "Saint Peter",
                1, // Different category
                0,
                houseOfDavidFlag,
                "House of David > Tribe of Judah > Simon Peter",
                "VATICAN",
                debtProof
            );
        });

        it("Should get owner relics", async function () {
            const relics = await saintRelicsNFT.getOwnerRelics(addr1.address);
            expect(relics.length).to.equal(2);
        });

        it("Should get saint token IDs", async function () {
            const tokenIds = await saintRelicsNFT.getSaintTokenIds("Saint Peter");
            expect(tokenIds.length).to.equal(2);
        });

        it("Should track total relics", async function () {
            expect(await saintRelicsNFT.totalRelics()).to.equal(2);
        });
    });
});
