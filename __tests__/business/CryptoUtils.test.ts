import { CryptoUtils } from 'business/CryptoUtils';
import { keccak256, solidityPacked } from 'ethers';

// Mock crypto.getRandomValues for deterministic tests
const mockRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = i % 256;
  }
  return arr;
});

global.crypto = {
  getRandomValues: mockRandomValues,
  subtle: {
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
} as any;

describe('CryptoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isHex', () => {
    it('should return true for hex strings starting with 0x', () => {
      expect(CryptoUtils.isHex('0x1234')).toBe(true);
      expect(CryptoUtils.isHex('0xabcdef')).toBe(true);
      expect(CryptoUtils.isHex('0x')).toBe(true);
    });

    it('should return false for non-hex strings', () => {
      expect(CryptoUtils.isHex('1234')).toBe(false);
      expect(CryptoUtils.isHex('abcdef')).toBe(false);
      expect(CryptoUtils.isHex('')).toBe(false);
    });
  });

  describe('isAddr', () => {
    it('should validate Ethereum addresses', () => {
      // Valid checksum addresses
      expect(CryptoUtils.isAddr('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toBe(true);
      expect(CryptoUtils.isAddr('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(CryptoUtils.isAddr('0x123')).toBe(false);
      expect(CryptoUtils.isAddr('not an address')).toBe(false);
      expect(CryptoUtils.isAddr('')).toBe(false);
    });
  });

  describe('randomString', () => {
    it('should generate string of specified length', () => {
      const result = CryptoUtils.randomString(20);
      expect(result).toHaveLength(20);
    });

    it('should generate string with default length 50', () => {
      const result = CryptoUtils.randomString();
      expect(result).toHaveLength(50);
    });

    it('should only use characters from alphabet', () => {
      const alphabet = 'ABC123';
      const result = CryptoUtils.randomString(100, alphabet);

      for (const char of result) {
        expect(alphabet).toContain(char);
      }
    });
  });

  describe('randomHex', () => {
    it('should generate 32-byte hex string', () => {
      const result = CryptoUtils.randomHex();

      expect(result).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(CryptoUtils.isHex(result)).toBe(true);
    });
  });

  describe('strToHex', () => {
    it('should convert string to hex', () => {
      const result = CryptoUtils.strToHex('hello');

      expect(CryptoUtils.isHex(result)).toBe(true);
      expect(result.length).toBeGreaterThan(2);
    });

    it('should handle empty string', () => {
      const result = CryptoUtils.strToHex('');

      expect(result).toBe('0x');
    });
  });

  describe('strToHex2', () => {
    it('should combine user and pass with colon', () => {
      const result = CryptoUtils.strToHex2('user', 'pass');
      const decoded = CryptoUtils.hexToStr(result);

      expect(decoded).toBe('user:pass');
    });
  });

  describe('hexToStr', () => {
    it('should convert hex back to string', () => {
      const original = 'test string';
      const hex = CryptoUtils.strToHex(original);
      const result = CryptoUtils.hexToStr(hex);

      expect(result).toBe(original);
    });

    it('should return empty string for non-hex input', () => {
      const result = CryptoUtils.hexToStr('not hex');

      expect(result).toBe('');
    });
  });

  describe('toBytesLike', () => {
    it('should add 0x prefix to hex without prefix', () => {
      expect(CryptoUtils.toBytesLike('1234')).toBe('0x1234');
    });

    it('should not modify hex with 0x prefix', () => {
      expect(CryptoUtils.toBytesLike('0x1234')).toBe('0x1234');
    });
  });

  describe('bytesToHex and hexToBytes', () => {
    it('should convert bytes to hex and back', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const hex = CryptoUtils.bytesToHex(bytes);
      const result = CryptoUtils.hexToBytes(hex);

      expect(result).toEqual(bytes);
      expect(CryptoUtils.isHex(hex)).toBe(true);
    });
  });

  describe('deterministic keccak helpers', () => {
    const globalSaltHex = '0x' + '11'.repeat(32);

    it('globalHash2Raw should match keccak256(solidityPacked([data, salt]))', () => {
      const dataHex = CryptoUtils.strToHex('email:password');
      const expected = keccak256(solidityPacked(['bytes', 'bytes32'], [dataHex, globalSaltHex]));
      expect(CryptoUtils.globalHash2Raw(dataHex, globalSaltHex)).toBe(expected);
    });

    it('globalHashWithSalt should match keccak256(solidityPacked([data, GLOBAL_SALT]))', () => {
      const dataHex = '0x1234';
      const expected = keccak256(solidityPacked(['bytes', 'bytes32'], [dataHex, globalSaltHex]));
      expect(CryptoUtils.globalHashWithSalt(dataHex, globalSaltHex)).toBe(expected);
    });

    it('recoveryVaultCommitmentFromInputData should match the spec formula', () => {
      const inputDataHex = CryptoUtils.strToHex2('alice@example.com', 'pw123');
      const proof = keccak256(solidityPacked(['bytes', 'bytes32'], [inputDataHex, globalSaltHex]));
      const expectedCommitment = keccak256(
        solidityPacked(['bytes32', 'bytes32'], [proof, globalSaltHex])
      );

      expect(CryptoUtils.recoveryVaultCommitmentFromInputData(inputDataHex, globalSaltHex)).toBe(
        expectedCommitment
      );
    });
  });

  describe('padTo32 and unpad32', () => {
    it('should pad bytes to 32 bytes', () => {
      const input = new Uint8Array([1, 2, 3]);
      const result = CryptoUtils.padTo32(input);

      expect(result.length).toBe(32);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(2);
      expect(result[2]).toBe(3);
      expect(result[31]).toBe(0);
    });

    it('should unpad 32-byte array', () => {
      const padded = new Uint8Array(32);
      padded[0] = 1;
      padded[1] = 2;
      padded[2] = 3;

      const result = CryptoUtils.unpad32(padded);

      expect(result).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('should handle fully padded array', () => {
      const padded = new Uint8Array(32);
      const result = CryptoUtils.unpad32(padded);

      expect(result.length).toBe(0);
    });
  });

  describe('x25519PublicKey', () => {
    it('should generate public key from 32-byte private key', () => {
      const priv = new Uint8Array(32);
      for (let i = 0; i < 32; i++) priv[i] = i;

      const pub = CryptoUtils.x25519PublicKey(priv);

      expect(pub).toBeInstanceOf(Uint8Array);
      expect(pub.length).toBe(32);
    });

    it('should throw error for non-32-byte private key', () => {
      const priv = new Uint8Array(16);

      expect(() => CryptoUtils.x25519PublicKey(priv)).toThrow('priv must be 32 bytes');
    });
  });

  describe('x25519Ephemeral', () => {
    it('should generate ephemeral key pair', () => {
      const { priv, pub } = CryptoUtils.x25519Ephemeral();

      expect(priv).toBeInstanceOf(Uint8Array);
      expect(pub).toBeInstanceOf(Uint8Array);
      expect(priv.length).toBe(32);
      expect(pub.length).toBe(32);
    });
  });

  describe('x25519Shared', () => {
    it('should compute shared secret', () => {
      const alice = CryptoUtils.x25519Ephemeral();
      const bob = CryptoUtils.x25519Ephemeral();

      const sharedAlice = CryptoUtils.x25519Shared(alice.priv, bob.pub);
      const sharedBob = CryptoUtils.x25519Shared(bob.priv, alice.pub);

      expect(sharedAlice).toEqual(sharedBob);
      expect(sharedAlice.length).toBe(32);
    });
  });

  describe('hkdf32', () => {
    it('should derive 32-byte key', async () => {
      const ikm = new Uint8Array(32);
      const salt = new Uint8Array(16);
      const info = new Uint8Array(8);

      const result = await CryptoUtils.hkdf32(ikm, salt, info);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });
  });

  // Note: AES-GCM encryption/decryption tests are skipped due to complex crypto.subtle mocking
  // These functions are tested through integration tests
});
