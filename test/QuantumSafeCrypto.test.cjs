const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuantumSafeCrypto", function () {
  let quantumSafeCrypto;

  beforeEach(async function () {
    const QuantumSafeCrypto = await ethers.getContractFactory("QuantumSafeCrypto");
    quantumSafeCrypto = await QuantumSafeCrypto.deploy();
    await quantumSafeCrypto.deployed();
  });

  describe("Dilithium Key Generation", function () {
    it("Should generate Dilithium key pair", async function () {
      const seed = ethers.utils.randomBytes(32);
      const keyPair = await quantumSafeCrypto.generateDilithiumKeyPair(ethers.BigNumber.from(seed));

      expect(keyPair.publicKey.length).to.equal(4);
      expect(keyPair.privateKey.length).to.equal(8);

      // Check that keys are within Dilithium modulus
      for (let i = 0; i < 4; i++) {
        expect(keyPair.publicKey[i]).to.be.lt(8380417); // DILITHIUM_Q
      }
      for (let i = 0; i < 8; i++) {
        expect(keyPair.privateKey[i]).to.be.lt(8380417); // DILITHIUM_Q
      }
    });
  });

  describe("Dilithium Signing and Verification", function () {
    it("Should sign and verify message with Dilithium", async function () {
      const seed = ethers.utils.randomBytes(32);
      const keyPair = await quantumSafeCrypto.generateDilithiumKeyPair(ethers.BigNumber.from(seed));

      const message = ethers.utils.toUtf8Bytes("Hello Quantum World");
      const [signature, commitment] = await quantumSafeCrypto.dilithiumSign(message, keyPair);

      const isValid = await quantumSafeCrypto.dilithiumVerify(message, signature, keyPair.publicKey, commitment);
      expect(isValid).to.be.true;
    });

    it("Should reject invalid signature", async function () {
      const seed = ethers.utils.randomBytes(32);
      const keyPair = await quantumSafeCrypto.generateDilithiumKeyPair(ethers.BigNumber.from(seed));

      const message = ethers.utils.toUtf8Bytes("Hello Quantum World");
      const wrongMessage = ethers.utils.toUtf8Bytes("Wrong Message");

      const [signature, commitment] = await quantumSafeCrypto.dilithiumSign(message, keyPair);

      const isValid = await quantumSafeCrypto.dilithiumVerify(wrongMessage, signature, keyPair.publicKey, commitment);
      expect(isValid).to.be.false;
    });
  });

  describe("XMSS Key Generation", function () {
    it("Should generate XMSS key pair", async function () {
      const seed = ethers.utils.randomBytes(32);
      const keyPair = await quantumSafeCrypto.generateXMSSKeyPair(ethers.BigNumber.from(seed));

      expect(keyPair.privateKeys.length).to.equal(1024); // 2^10
      expect(keyPair.index).to.equal(0);
    });
  });

  describe("XMSS Signing and Verification", function () {
    it("Should sign and verify message with XMSS", async function () {
      const seed = ethers.utils.randomBytes(32);
      const keyPair = await quantumSafeCrypto.generateXMSSKeyPair(ethers.BigNumber.from(seed));

      const message = ethers.utils.toUtf8Bytes("XMSS Test Message");
      const [signature, newRoot] = await quantumSafeCrypto.xmssSign(message, keyPair);

      const isValid = await quantumSafeCrypto.xmssVerify(message, signature, keyPair.root);
      expect(isValid).to.be.true;
    });

    it("Should reject XMSS signature after key exhaustion", async function () {
      const seed = ethers.utils.randomBytes(32);
      const keyPair = await quantumSafeCrypto.generateXMSSKeyPair(ethers.BigNumber.from(seed));

      // Exhaust all keys (simulate)
      for (let i = 0; i < 1024; i++) {
        const message = ethers.utils.toUtf8Bytes(`Message ${i}`);
        await quantumSafeCrypto.xmssSign(message, keyPair);
      }

      const message = ethers.utils.toUtf8Bytes("Should fail");
      await expect(quantumSafeCrypto.xmssSign(message, keyPair)).to.be.revertedWith("XMSS key exhausted");
    });
  });

  describe("Quantum Hash", function () {
    it("Should generate quantum-resistant hash", async function () {
      const data = ethers.utils.toUtf8Bytes("Quantum Hash Test");
      const hash1 = await quantumSafeCrypto.quantumHash(data);
      const hash2 = await quantumSafeCrypto.quantumHash(data);

      expect(hash1).to.equal(hash2); // Deterministic
      expect(hash1).to.not.equal(ethers.constants.HashZero);
    });

    it("Should produce different hashes for different data", async function () {
      const data1 = ethers.utils.toUtf8Bytes("Data 1");
      const data2 = ethers.utils.toUtf8Bytes("Data 2");

      const hash1 = await quantumSafeCrypto.quantumHash(data1);
      const hash2 = await quantumSafeCrypto.quantumHash(data2);

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("Quantum Random", function () {
    it("Should generate quantum-resistant random number", async function () {
      const seed = ethers.BigNumber.from(ethers.utils.randomBytes(32));
      const nonce = 12345;

      const random1 = await quantumSafeCrypto.quantumRandom(seed, nonce);
      const random2 = await quantumSafeCrypto.quantumRandom(seed, nonce);

      expect(random1).to.equal(random2); // Deterministic with same inputs
      expect(random1).to.not.equal(0);
    });

    it("Should produce different random numbers with different seeds", async function () {
      const seed1 = ethers.BigNumber.from(ethers.utils.randomBytes(32));
      const seed2 = ethers.BigNumber.from(ethers.utils.randomBytes(32));
      const nonce = 12345;

      const random1 = await quantumSafeCrypto.quantumRandom(seed1, nonce);
      const random2 = await quantumSafeCrypto.quantumRandom(seed2, nonce);

      expect(random1).to.not.equal(random2);
    });
  });
});
