const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumAIContent", function () {
  let quantumSafeCrypto, quantumAIVerifier, quantumGodToken, quantumAIContent;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy dependencies
    const QuantumSafeCrypto = await ethers.getContractFactory("QuantumSafeCrypto");
    quantumSafeCrypto = await QuantumSafeCrypto.deploy();
    await quantumSafeCrypto.deployed();

    const QuantumAIVerifier = await ethers.getContractFactory("QuantumAIVerifier");
    quantumAIVerifier = await QuantumAIVerifier.deploy();
    await quantumAIVerifier.deployed();

    const QuantumGodToken = await ethers.getContractFactory("QuantumGodToken");
    quantumGodToken = await QuantumGodToken.deploy(
      addr1.address, // mock AI verifier
      ethers.constants.AddressZero, // mock consensus
      quantumAIVerifier.address
    );
    await quantumGodToken.deployed();

    // Deploy main contract
    const QuantumAIContent = await ethers.getContractFactory("QuantumAIContent");
    quantumAIContent = await QuantumAIContent.deploy(
      quantumSafeCrypto.address,
      quantumAIVerifier.address,
      quantumGodToken.address
    );
    await quantumAIContent.deployed();

    // Mint tokens for testing
    await quantumGodToken.mint(addr1.address, ethers.utils.parseEther("10000"));
    await quantumGodToken.mint(addr2.address, ethers.utils.parseEther("10000"));
  });

  describe("Content Upload", function () {
    it("Should upload content", async function () {
      const contentHash = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);
      const isEncrypted = true;
      const accessFee = ethers.utils.parseEther("10");

      await expect(quantumAIContent.connect(addr1).uploadContent(
        contentHash,
        quantumEncryptionKey,
        isEncrypted,
        accessFee
      )).to.emit(quantumAIContent, "ContentUploaded");

      const content = await quantumAIContent.contentItems(contentHash);
      expect(content.creator).to.equal(addr1.address);
      expect(content.isEncrypted).to.be.true;
      expect(content.accessFee).to.equal(accessFee);
    });

    it("Should reject uploading existing content", async function () {
      const contentHash = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash,
        quantumEncryptionKey,
        false,
        0
      );

      await expect(quantumAIContent.connect(addr2).uploadContent(
        contentHash,
        quantumEncryptionKey,
        false,
        0
      )).to.be.revertedWith("Content already exists");
    });
  });

  describe("Content Sharing", function () {
    let contentHash;

    beforeEach(async function () {
      contentHash = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash,
        quantumEncryptionKey,
        false,
        ethers.utils.parseEther("5")
      );
    });

    it("Should share content with another user", async function () {
      const quantumAccessKey = ethers.utils.randomBytes(32);
      const duration = 3600; // 1 hour

      await expect(quantumAIContent.connect(addr1).shareContent(
        contentHash,
        addr2.address,
        quantumAccessKey,
        duration
      )).to.emit(quantumAIContent, "ContentShared");
    });

    it("Should access shared content", async function () {
      const quantumAccessKey = ethers.utils.randomBytes(32);
      const duration = 3600;

      // Share content
      const shareTx = await quantumAIContent.connect(addr1).shareContent(
        contentHash,
        addr2.address,
        quantumAccessKey,
        duration
      );
      const shareReceipt = await shareTx.wait();
      const shareEvent = shareReceipt.events.find(e => e.event === 'ContentShared');
      const shareId = shareEvent.args.shareId;

      // Access content
      await quantumGodToken.connect(addr2).approve(quantumAIContent.address, ethers.utils.parseEther("5"));

      await expect(quantumAIContent.connect(addr2).accessSharedContent(shareId))
        .to.emit(quantumAIContent, "ContentAccessed");
    });

    it("Should reject accessing expired share", async function () {
      const quantumAccessKey = ethers.utils.randomBytes(32);
      const duration = 1; // 1 second

      // Share content
      const shareTx = await quantumAIContent.connect(addr1).shareContent(
        contentHash,
        addr2.address,
        quantumAccessKey,
        duration
      );
      const shareReceipt = await shareTx.wait();
      const shareEvent = shareReceipt.events.find(e => e.event === 'ContentShared');
      const shareId = shareEvent.args.shareId;

      // Wait for expiration (simulate by mining blocks)
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      await quantumGodToken.connect(addr2).approve(quantumAIContent.address, ethers.utils.parseEther("5"));

      await expect(quantumAIContent.connect(addr2).accessSharedContent(shareId))
        .to.be.revertedWith("Share expired");
    });
  });

  describe("Content Verification", function () {
    it("Should request content verification", async function () {
      const contentHash = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash,
        quantumEncryptionKey,
        false,
        0
      );

      const verificationData = ethers.utils.randomBytes(32);

      await expect(quantumAIContent.connect(addr1).requestContentVerification(
        contentHash,
        verificationData
      )).to.emit(quantumAIContent, "ContentVerified");
    });
  });

  describe("Content Access Control", function () {
    it("Should get content access information", async function () {
      const contentHash = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);
      const accessFee = ethers.utils.parseEther("10");

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash,
        quantumEncryptionKey,
        true,
        accessFee
      );

      const [hasAccess, isVerified, isEncrypted, fee, creator] = await quantumAIContent.getContentAccess(
        contentHash,
        addr2.address
      );

      expect(hasAccess).to.be.false;
      expect(isVerified).to.be.false;
      expect(isEncrypted).to.be.true;
      expect(fee).to.equal(accessFee);
      expect(creator).to.equal(addr1.address);
    });

    it("Should get user content list", async function () {
      const contentHash1 = ethers.utils.randomBytes(32);
      const contentHash2 = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash1,
        quantumEncryptionKey,
        false,
        0
      );

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash2,
        quantumEncryptionKey,
        false,
        0
      );

      const userContent = await quantumAIContent.getUserContent(addr1.address);
      expect(userContent.length).to.equal(2);
    });
  });

  describe("Share Management", function () {
    it("Should revoke content share", async function () {
      const contentHash = ethers.utils.randomBytes(32);
      const quantumEncryptionKey = ethers.utils.randomBytes(32);

      await quantumAIContent.connect(addr1).uploadContent(
        contentHash,
        quantumEncryptionKey,
        false,
        0
      );

      const quantumAccessKey = ethers.utils.randomBytes(32);
      const duration = 3600;

      const shareTx = await quantumAIContent.connect(addr1).shareContent(
        contentHash,
        addr2.address,
        quantumAccessKey,
        duration
      );
      const shareReceipt = await shareTx.wait();
      const shareEvent = shareReceipt.events.find(e => e.event === 'ContentShared');
      const shareId = shareEvent.args.shareId;

      await quantumAIContent.connect(addr1).revokeContentShare(shareId);

      const share = await quantumAIContent.contentShares(shareId);
      expect(share.isActive).to.be.false;
    });
  });
});
