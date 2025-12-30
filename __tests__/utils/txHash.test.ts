import { normalizeTxHash } from 'utils/txHash';

describe('normalizeTxHash', () => {
  it('returns null for empty inputs', () => {
    expect(normalizeTxHash()).toBeNull();
    expect(normalizeTxHash(null)).toBeNull();
    expect(normalizeTxHash('')).toBeNull();
    expect(normalizeTxHash('   ')).toBeNull();
  });

  it('extracts a 0x-prefixed 32-byte hash from surrounding text', () => {
    const hex = 'A0'.repeat(32); // 64 hex chars
    const input = `Transaction hash: 0x${hex}`;
    expect(normalizeTxHash(input)).toBe(`0x${hex.toLowerCase()}`);
  });

  it('extracts a non-0x 32-byte hash', () => {
    const hex = 'b'.repeat(64);
    expect(normalizeTxHash(hex)).toBe(`0x${hex}`);
  });

  it('returns null when no 32-byte hash is present', () => {
    expect(normalizeTxHash('hash-payment')).toBeNull();
    expect(normalizeTxHash('0x1234')).toBeNull();
  });
});
