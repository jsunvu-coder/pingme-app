import {
  getBytes,
  hexlify,
  isAddress,
  keccak256,
  solidityPacked,
  toUtf8Bytes,
  toUtf8String,
} from 'ethers';
import { x25519 } from '@noble/curves/ed25519';
import { GLOBAL_SALT, GLOBALS, NOT_HEX } from './Constants';
import { Utils } from './Utils';
import 'react-native-get-random-values';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

export class CryptoUtils {
  private static asArrayBufferStrict(view: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy.buffer;
  }

  /**
   * Deterministic global hash: keccak256(solidityPacked([data, globalSalt])).
   * - `hexData` is `0x...` bytes or bytes32.
   * - `globalSaltHex` must be a `0x...` bytes32.
   */
  static globalHashWithSalt(hexData: string, globalSaltHex: string): string {
    if (!CryptoUtils.isHex(hexData)) throw new Error(NOT_HEX);
    if (!CryptoUtils.isHex(globalSaltHex) || globalSaltHex.length !== 66) {
      throw new Error('globalSaltHex must be a bytes32 hex string');
    }

    const dataType = hexData.length === 66 ? 'bytes32' : 'bytes';
    const packed = solidityPacked([dataType, 'bytes32'], [hexData, globalSaltHex]);
    return keccak256(packed);
  }

  /**
   * Deterministic salted hash: keccak256(solidityPacked([data, salt])).
   * - `hexData` is `0x...` bytes
   * - `hexSalt` must be a `0x...` bytes32
   */
  static globalHash2Raw(hexData: string, hexSalt: string): string {
    if (!CryptoUtils.isHex(hexData)) throw new Error(NOT_HEX);
    if (!CryptoUtils.isHex(hexSalt) || hexSalt.length !== 66) {
      throw new Error('hexSalt must be a bytes32 hex string');
    }
    const packed = solidityPacked(['bytes', 'bytes32'], [hexData, hexSalt]);
    return keccak256(packed);
  }

  /**
   * Recovery-vault commitment per spec:
   * commitment = globalHash(globalHash2(input_data, GLOBAL_SALT))
   * where input_data = bytes("email:password")
   */
  static recoveryVaultCommitmentFromInputData(inputDataHex: string, globalSaltHex: string): string {
    const proof = CryptoUtils.globalHash2(inputDataHex, globalSaltHex);
    if (!proof) throw new Error('Failed to generate proof.');
    const commitment = CryptoUtils.globalHash(proof);
    if (!commitment) throw new Error('Failed to generate commitment.');
    return commitment;
  }

  static recoveryVaultCommitmentFromCredentials(
    email: string,
    password: string,
    globalSaltHex: string
  ): string {
    const inputDataHex = CryptoUtils.strToHex2(email, password);
    return CryptoUtils.recoveryVaultCommitmentFromInputData(inputDataHex, globalSaltHex);
  }

  static globalHash(hexData: string): string | null {
    if (!CryptoUtils.isHex(hexData)) {
      throw new Error(NOT_HEX);
    }

    // React Native: session retrieval is async
    const sessionObj = Utils.getSessionObject(GLOBALS);

    // Ensure we always have a valid BytesLike for salt
    let globalSalt = sessionObj?.[GLOBAL_SALT];
    if (!globalSalt || !CryptoUtils.isHex(globalSalt)) {
      globalSalt = '0x';
    }
    const dataType = hexData.length === 66 ? 'bytes32' : 'bytes';
    const packed = solidityPacked([dataType, 'bytes32'], [hexData, globalSalt]);
    const hash = keccak256(packed);
    return hash;
  }

  static globalHash2(hexData: string, hexSalt: string): string | null {
    const packed = solidityPacked(['bytes', 'bytes32'], [hexData, hexSalt]);
    return CryptoUtils.globalHash(packed);
  }

  static bytesToHex(b: Uint8Array): string {
    return hexlify(b);
  }

  static hexToBytes(s: string): Uint8Array {
    return getBytes(s);
  }

  static isAddr(addr: string): boolean {
    return isAddress(addr);
  }

  static isHex(s: string): boolean {
    return s.startsWith('0x');
  }

  static randomString(
    len = 50,
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let s = '';
    for (let i = 0; i < len; ++i) {
      s += alphabet[bytes[i] % alphabet.length];
    }
    return s;
  }

  static randomHex(): string {
    return hexlify(crypto.getRandomValues(new Uint8Array(32)));
  }

  static strToHex(val: string): string {
    return hexlify(toUtf8Bytes(val));
  }

  static strToHex2(user: string, pass: string): string {
    return CryptoUtils.strToHex(`${user}:${pass}`);
  }

  static toBytesLike(hex: string): string {
    console.log('toBytesLike input:', hex);
    return hex.startsWith('0x') ? hex : '0x' + hex;
  }

  static hexToStr(hex: string): string {
    return CryptoUtils.isHex(hex) ? toUtf8String(CryptoUtils.hexToBytes(hex)) : '';
  }

  static padTo32(b: Uint8Array): Uint8Array {
    const out = new Uint8Array(32);
    out.set(b, 0);
    return out;
  }

  static unpad32(padded: Uint8Array): Uint8Array {
    let end = padded.length;
    while (end > 0 && padded[end - 1] === 0) end--;
    return padded.slice(0, end);
  }

  static x25519PublicKey(priv: Uint8Array): Uint8Array {
    if (priv.length !== 32) {
      throw new Error('priv must be 32 bytes');
    }
    return x25519.getPublicKey(priv);
  }

  static x25519Ephemeral(): { priv: Uint8Array; pub: Uint8Array } {
    const priv = crypto.getRandomValues(new Uint8Array(32));
    const pub = x25519.getPublicKey(priv);
    return { priv, pub };
  }

  static x25519Shared(priv: Uint8Array, pub: Uint8Array): Uint8Array {
    return x25519.getSharedSecret(priv, pub); // 32 bytes
  }

  static async hkdf32(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array): Promise<Uint8Array> {
    const okm = hkdf(sha256, ikm, salt, info, 32);
    return new Uint8Array(okm);
  }

  static async aesGcmEncrypt256(
    key: Uint8Array,
    plaintext: Uint8Array
  ): Promise<{ ct: Uint8Array; tag: Uint8Array; nonce: Uint8Array }> {
    const subtle: any = (crypto as any)?.subtle ?? (crypto as any).subtle;
    const k = await subtle.importKey(
      'raw',
      CryptoUtils.asArrayBufferStrict(key),
      'AES-GCM',
      false,
      ['encrypt']
    );
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ctTag = new Uint8Array(
      await subtle.encrypt(
        { name: 'AES-GCM', iv: CryptoUtils.asArrayBufferStrict(nonce) },
        k,
        CryptoUtils.asArrayBufferStrict(plaintext)
      )
    );
    const ct = ctTag.slice(0, ctTag.length - 16);
    const tag = ctTag.slice(ctTag.length - 16);
    return { ct, tag, nonce };
  }

  static async aesGcmDecrypt256(
    key: Uint8Array,
    ct: Uint8Array,
    tag: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    const subtle: any = (crypto as any)?.subtle ?? (crypto as any).subtle;
    const k = await subtle.importKey(
      'raw',
      CryptoUtils.asArrayBufferStrict(key),
      'AES-GCM',
      false,
      ['decrypt']
    );
    const ctTag = new Uint8Array(ct.length + tag.length);
    ctTag.set(ct, 0);
    ctTag.set(tag, ct.length);
    const pt = await subtle.decrypt(
      { name: 'AES-GCM', iv: CryptoUtils.asArrayBufferStrict(nonce) },
      k,
      CryptoUtils.asArrayBufferStrict(ctTag)
    );
    return new Uint8Array(pt);
  }
}
