import pkg from "hardhat";
const { ethers } = pkg;
import fs from "node:fs";

async function main() {
  console.log("Deploying GOD-TOKEN-COIN contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy QuantumSafeCrypto first (base for all quantum contracts)
  console.log("Deploying QuantumSafeCrypto...");
  const QuantumSafeCrypto = await ethers.getContractFactory("QuantumSafeCrypto");
  const quantumSafeCrypto = await QuantumSafeCrypto.deploy();
  await quantumSafeCrypto.deployed();
  console.log("QuantumSafeCrypto deployed to:", quantumSafeCrypto.address);

  // Deploy QuantumConsensus
  console.log("Deploying QuantumConsensus...");
  const QuantumConsensus = await ethers.getContractFactory("QuantumConsensus");
  const quantumConsensus = await QuantumConsensus.deploy();
  await quantumConsensus.deployed();
  console.log("QuantumConsensus deployed to:", quantumConsensus.address);

  // Deploy QuantumAIVerifier
  console.log("Deploying QuantumAIVerifier...");
  const QuantumAIVerifier = await ethers.getContractFactory("QuantumAIVerifier");
  const quantumAIVerifier = await QuantumAIVerifier.deploy();
  await quantumAIVerifier.deployed();
  console.log("QuantumAIVerifier deployed to:", quantumAIVerifier.address);

  // Deploy AIVerifier first
  console.log("Deploying AIVerifier...");
  const AIVerifier = await ethers.getContractFactory("AIVerifier");
  const aiVerifier = await AIVerifier.deploy();
  await aiVerifier.deployed();
  console.log("AIVerifier deployed to:", aiVerifier.address);

  // Deploy QuantumGodToken with quantum components
  console.log("Deploying QuantumGodToken...");
  const QuantumGodToken = await ethers.getContractFactory("QuantumGodToken");
  const quantumGodToken = await QuantumGodToken.deploy(
    aiVerifier.address,
    quantumConsensus.address,
    quantumAIVerifier.address
  );
  await quantumGodToken.deployed();
  console.log("QuantumGodToken deployed to:", quantumGodToken.address);

  // Deploy GodToken with AI verifier address (legacy)
  console.log("Deploying GodToken...");
  const GodToken = await ethers.getContractFactory("GodToken");
  const godToken = await GodToken.deploy(aiVerifier.address);
  await godToken.deployed();
  console.log("GodToken deployed to:", godToken.address);

  // Deploy GodNFT
  console.log("Deploying GodNFT...");
  const GodNFT = await ethers.getContractFactory("GodNFT");
  const godNFT = await GodNFT.deploy();
  await godNFT.deployed();
  console.log("GodNFT deployed to:", godNFT.address);

  // Deploy GodStaking with GodToken address
  console.log("Deploying GodStaking...");
  const GodStaking = await ethers.getContractFactory("GodStaking");
  const godStaking = await GodStaking.deploy(godToken.address);
  await godStaking.deployed();
  console.log("GodStaking deployed to:", godStaking.address);

  // Deploy Quantum AI Internet contracts
  console.log("Deploying QuantumAINetwork...");
  const QuantumAINetwork = await ethers.getContractFactory("QuantumAINetwork");
  const quantumAINetwork = await QuantumAINetwork.deploy(
    quantumSafeCrypto.address,
    quantumConsensus.address,
    quantumAIVerifier.address,
    quantumGodToken.address
  );
  await quantumAINetwork.deployed();
  console.log("QuantumAINetwork deployed to:", quantumAINetwork.address);

  console.log("Deploying QuantumAIContent...");
  const QuantumAIContent = await ethers.getContractFactory("QuantumAIContent");
  const quantumAIContent = await QuantumAIContent.deploy(
    quantumSafeCrypto.address,
    quantumAIVerifier.address,
    quantumGodToken.address
  );
  await quantumAIContent.deployed();
  console.log("QuantumAIContent deployed to:", quantumAIContent.address);

  console.log("Deploying QuantumAICompute...");
  const QuantumAICompute = await ethers.getContractFactory("QuantumAICompute");
  const quantumAICompute = await QuantumAICompute.deploy(
    quantumSafeCrypto.address,
    quantumConsensus.address,
    quantumAIVerifier.address,
    quantumGodToken.address
  );
  await quantumAICompute.deployed();
  console.log("QuantumAICompute deployed to:", quantumAICompute.address);

  console.log("Deploying QuantumAISecurity...");
  const QuantumAISecurity = await ethers.getContractFactory("QuantumAISecurity");
  const quantumAISecurity = await QuantumAISecurity.deploy(
    quantumSafeCrypto.address,
    quantumAIVerifier.address,
    quantumConsensus.address
  );
  await quantumAISecurity.deployed();
  console.log("QuantumAISecurity deployed to:", quantumAISecurity.address);

  // Authorize deployer as AI verifier
  console.log("Authorizing deployer as AI verifier...");
  await aiVerifier.authorizeVerifier(deployer.address);
  console.log("Deployer authorized as AI verifier");

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    quantumSafeCrypto: quantumSafeCrypto.address,
    quantumConsensus: quantumConsensus.address,
    quantumAIVerifier: quantumAIVerifier.address,
    aiVerifier: aiVerifier.address,
    quantumGodToken: quantumGodToken.address,
    godToken: godToken.address,
    godNFT: godNFT.address,
    godStaking: godStaking.address,
    quantumAINetwork: quantumAINetwork.address,
    quantumAIContent: quantumAIContent.address,
    quantumAICompute: quantumAICompute.address,
    quantumAISecurity: quantumAISecurity.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  console.log("Deployment completed!");
  console.log("Contract addresses:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment.json");
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
