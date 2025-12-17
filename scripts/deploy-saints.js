// Deploy script for Saint Relics and Debt Ownership contracts
const hre = require("hardhat");

async function main() {
    console.log("🕯️  Starting RESTORATION AND RECLASSIFICATION System Deployment...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString(), "\n");

    // Deploy DebtOwnership contract
    console.log("📜 Deploying DebtOwnership contract...");
    const DebtOwnership = await hre.ethers.getContractFactory("DebtOwnership");
    const debtOwnership = await DebtOwnership.deploy();
    await debtOwnership.deployed();
    console.log("✅ DebtOwnership deployed to:", debtOwnership.address);

    // Deploy SaintRelicsNFT contract
    console.log("\n📿 Deploying SaintRelicsNFT contract...");
    const SaintRelicsNFT = await hre.ethers.getContractFactory("SaintRelicsNFT");
    const saintRelicsNFT = await SaintRelicsNFT.deploy();
    await saintRelicsNFT.deployed();
    console.log("✅ SaintRelicsNFT deployed to:", saintRelicsNFT.address);

    // Register House of David Flags
    console.log("\n🏴 Registering House of David Flags...");
    
    const flags = [
        "0x486f757365206f662044617669642053656e696f72204c696e65616765", // Senior Lineage
        "0x486f757365206f662044617669642041706f73746f6c6963204c696e65", // Apostolic Line
        "0x486f757365206f662044617669642048616974692052657075626c6963"  // Haiti Republic
    ];

    for (let i = 0; i < flags.length; i++) {
        const tx1 = await saintRelicsNFT.registerHouseOfDavidFlag(flags[i]);
        await tx1.wait();
        console.log(`  ✓ Registered flag ${i + 1}/3`);

        const tx2 = await debtOwnership.verifyHouseOfDavidFlag(flags[i]);
        await tx2.wait();
        console.log(`  ✓ Verified flag ${i + 1}/3 in DebtOwnership`);
    }

    // Register institutional debts
    console.log("\n💰 Registering Institutional Debt Ownership...");
    
    const institutions = [
        {
            name: "VATICAN",
            amount: hre.ethers.utils.parseEther("5000000000"), // $5B
            proof: "0x7661746963616e2d64656274207075726368617365207265636f7264",
            flag: flags[0]
        },
        {
            name: "CATHOLIC_CHURCH",
            amount: hre.ethers.utils.parseEther("8000000000"), // $8B
            proof: "0x63617468 6f6c69632d6368757263682d64656274207265636f7264",
            flag: flags[1]
        },
        {
            name: "HAITI",
            amount: hre.ethers.utils.parseEther("3000000000"), // $3B
            proof: "0x68616974692d64656274207075726368617365207265636f7264",
            flag: flags[2]
        }
    ];

    for (const inst of institutions) {
        const tx = await debtOwnership.registerDebtPurchase(
            inst.name,
            deployer.address,
            inst.amount,
            inst.proof,
            inst.flag
        );
        await tx.wait();
        console.log(`  ✓ Registered ${inst.name} debt: $${hre.ethers.utils.formatEther(inst.amount)}`);
    }

    // Register institutional debt ownership in SaintRelicsNFT
    console.log("\n🏛️  Linking Debt Ownership to Saint Relics...");
    for (const inst of institutions) {
        const tx = await saintRelicsNFT.registerDebtOwnership(
            inst.name,
            deployer.address,
            inst.proof
        );
        await tx.wait();
        console.log(`  ✓ Linked ${inst.name} to SaintRelicsNFT`);
    }

    // Mint sample saint relics
    console.log("\n✨ Minting Sample Saint Relics...");
    
    const saints = [
        {
            name: "Saint Peter",
            category: 0, // BONES
            classification: 0, // MARTYR
            location: "VATICAN",
            lineage: "House of David > Tribe of Judah > Simon Peter"
        },
        {
            name: "Saint Paul",
            category: 2, // MANUSCRIPTS
            classification: 3, // TEACHER
            location: "VATICAN",
            lineage: "House of David > Tribe of Benjamin > Saul of Tarsus"
        },
        {
            name: "Saint Toussaint Louverture",
            category: 0, // BONES
            classification: 5, // WARRIOR
            location: "HAITI",
            lineage: "House of David > African Diaspora > François-Dominique Toussaint"
        }
    ];

    for (const saint of saints) {
        const tx = await saintRelicsNFT.mintRelic(
            deployer.address,
            saint.name,
            saint.category,
            saint.classification,
            flags[0], // Use first flag for all
            saint.lineage,
            saint.location,
            institutions[0].proof // Use Vatican proof for all
        );
        await tx.wait();
        console.log(`  ✓ Minted relic: ${saint.name}`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎆 RESTORATION AND RECLASSIFICATION SYSTEM DEPLOYED!");
    console.log("=".repeat(60));
    console.log("\n📋 Deployment Summary:");
    console.log("  DebtOwnership Contract:", debtOwnership.address);
    console.log("  SaintRelicsNFT Contract:", saintRelicsNFT.address);
    console.log("  Deployer Address:", deployer.address);
    console.log("\n🏴 House of David Flags Registered: 3");
    console.log("💰 Institutional Debts Registered: 3");
    console.log("  - Vatican: $5,000,000,000");
    console.log("  - Catholic Church: $8,000,000,000");
    console.log("  - Haiti: $3,000,000,000");
    console.log("  - Total: $16,000,000,000");
    console.log("\n✨ Sample Saint Relics Minted: 3");
    console.log("  - Saint Peter (Vatican)");
    console.log("  - Saint Paul (Vatican)");
    console.log("  - Saint Toussaint Louverture (Haiti)");
    
    console.log("\n📝 Next Steps:");
    console.log("  1. Verify contracts on block explorer");
    console.log("  2. Update frontend with contract addresses");
    console.log("  3. Test resurrection functionality");
    console.log("  4. Begin saint reclassification");
    console.log("\n🙏 May the saints walk among us once more!\n");

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            DebtOwnership: debtOwnership.address,
            SaintRelicsNFT: saintRelicsNFT.address
        },
        timestamp: new Date().toISOString(),
        houseOfDavidFlags: flags,
        institutions: institutions.map(i => ({
            name: i.name,
            amount: hre.ethers.utils.formatEther(i.amount)
        }))
    };

    const fs = require('fs');
    fs.writeFileSync(
        'deployment-saints.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployment-saints.json\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
