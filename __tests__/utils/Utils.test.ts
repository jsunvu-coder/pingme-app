import { Utils } from 'business/Utils';

describe('Utils.toCurrency', () => {
  it('formats valid numbers with two decimals', () => {
    expect(Utils.toCurrency('1234.5')).toBe('1,234.50');
  });

  it('returns empty string for invalid input', () => {
    expect(Utils.toCurrency('abc')).toBe('');
  });
});

describe('Utils.toMicro', () => {
  it('converts decimal to micro units', () => {
    expect(Utils.toMicro('1.23')).toBe(BigInt(1_230_000));
  });
});
