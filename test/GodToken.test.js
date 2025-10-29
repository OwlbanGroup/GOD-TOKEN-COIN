const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GodToken", function () {
  let godToken, aiVerifier, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy AIVerifier first
    const AIVerifier = await ethers.getContractFactory("AIVerifier");
    aiVerifier = await AIVerifier.deploy();
    await aiVerifier.deployed();

    // Deploy GodToken
    const GodToken = await ethers.getContractFactory("GodToken");
    godToken = await GodToken.deploy(aiVerifier.address);
    await godToken.deployed();

    // Authorize owner as verifier
    await aiVerifier.authorizeVerifier(owner.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await godToken.owner()).to.equal(owner.address);
    });

    it("Should set the AI verifier", async function () {
      expect(await godToken.aiVerifier()).to.equal(aiVerifier.address);
    });

    it("Should have initial supply", async function () {
      expect(await godToken.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
    });
  });

  describe("Minting", function () {
    it("Should mint tokens with AI verification", async function () {
      const amount = ethers.utils.parseEther("100");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));

      // Request verification first
      const requestId = await aiVerifier.requestVerification(1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") });

      // Update reserves first
      await godToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));

      // Submit verification result
      await aiVerifier.submitVerification(requestId, true, requestId);

      await expect(godToken.mintWithVerification(addr1.address, amount, requestId))
        .to.emit(godToken, "TokensMinted")
        .withArgs(addr1.address, amount, requestId);

      expect(await godToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should reject minting without sufficient reserves", async function () {
      const amount = ethers.utils.parseEther("100");
      const sensorDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sensor-data"));

      // Request verification first
      const requestId = await aiVerifier.requestVerification(1, 100, 999, sensorDataHash, { value: ethers.utils.parseEther("0.01") });

      // Submit verification result
      await aiVerifier.submitVerification(requestId, true, requestId);

      await expect(godToken.mintWithVerification(addr1.address, amount, requestId))
        .to.be.revertedWith("Insufficient metal reserves");
    });
  });

  describe("Burning", function () {
    it("Should burn tokens", async function () {
      const amount = ethers.utils.parseEther("100");
      const verificationId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-verification"));

      // Request verification first
      await aiVerifier.requestVerification(1, 100, 999, verificationId, { value: ethers.utils.parseEther("0.01") });

      // Update reserves and mint first
      await godToken.updateReserves(1000, 500, ethers.utils.parseEther("100000"));
      await aiVerifier.submitVerification(verificationId, true, verificationId);
      await godToken.mintWithVerification(addr1.address, amount, verificationId);

      await expect(godToken.connect(addr1).burn(amount))
        .to.emit(godToken, "TokensBurned")
        .withArgs(addr1.address, amount);

      expect(await godToken.balanceOf(addr1.address)).to.equal(0);
    });
  });
});
