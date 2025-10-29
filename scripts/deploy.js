const pkg = require("hardhat");
const { ethers } = pkg;
const fs = require("node:fs");

async function main() {
  console.log("Deploying GOD-TOKEN-COIN contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy QuantumConsensus first
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

  // Authorize deployer as AI verifier
  console.log("Authorizing deployer as AI verifier...");
  await aiVerifier.authorizeVerifier(deployer.address);
  console.log("Deployer authorized as AI verifier");

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    quantumConsensus: quantumConsensus.address,
    quantumAIVerifier: quantumAIVerifier.address,
    aiVerifier: aiVerifier.address,
    quantumGodToken: quantumGodToken.address,
    godToken: godToken.address,
    godNFT: godNFT.address,
    godStaking: godStaking.address,
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
