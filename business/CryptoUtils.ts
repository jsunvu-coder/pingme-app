import {
  getBytes,
  hexlify,
  isAddress,
  keccak256,
  solidityPacked,
  toUtf8Bytes,
  toUtf8String,
} from "ethers";
import { x25519 } from "@noble/curves/ed25519";
import { GLOBAL_SALT, GLOBALS, NOT_HEX } from "./Constants";
import { Utils } from "./Utils";
import "react-native-get-random-values";

export class CryptoUtils {
  static globalHash(hexData: string): string | null {

    if (!CryptoUtils.isHex(hexData)) {
      throw new Error(NOT_HEX);
    }

    // React Native: session retrieval is async
    const sessionObj = Utils.getSessionObject(GLOBALS);

    // Ensure we always have a valid BytesLike for salt
    let globalSalt = sessionObj?.[GLOBAL_SALT];
    if (!globalSalt || !CryptoUtils.isHex(globalSalt)) {
      globalSalt = "0x";
    }
    const dataType = hexData.length === 66 ? "bytes32" : "bytes";
    const packed = solidityPacked([dataType, "bytes32"], [hexData, globalSalt]);
    const hash = keccak256(packed);
    return hash;
  }

  static globalHash2(hexData: string, hexSalt: string): string | null {
    const packed = solidityPacked(["bytes", "bytes32"], [hexData, hexSalt]);
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
    return s.startsWith("0x");
  }

  static randomString(
    len = 16,
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  ): string {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let s = "";
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
    return hex.startsWith("0x") ? hex : "0x" + hex;
  }

  static hexToStr(hex: string): string {
    return CryptoUtils.isHex(hex)
      ? toUtf8String(CryptoUtils.hexToBytes(hex))
      : "";
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
      throw new Error("priv must be 32 bytes");
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

  static async hkdf32(
    ikm: Uint8Array,
    salt: Uint8Array,
    info: Uint8Array
  ): Promise<Uint8Array> {
    const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info },
      baseKey,
      256
    );
    return new Uint8Array(bits);
  }

  static async aesGcmEncrypt256(
    key: Uint8Array,
    plaintext: Uint8Array
  ): Promise<{ ct: Uint8Array; tag: Uint8Array; nonce: Uint8Array }> {
    const k = await crypto.subtle.importKey("raw", key, "AES-GCM", false, [
      "encrypt",
    ]);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ctTag = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, plaintext)
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
    const k = await crypto.subtle.importKey("raw", key, "AES-GCM", false, [
      "decrypt",
    ]);
    const ctTag = new Uint8Array(ct.length + tag.length);
    ctTag.set(ct, 0);
    ctTag.set(tag, ct.length);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, k, ctTag);
    return new Uint8Array(pt);
  }
}
