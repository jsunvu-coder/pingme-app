export function normalizeTxHash(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Prefer extracting a real 32-byte tx hash instead of stripping characters from the whole string.
  // Some sources may include prefixes like "Transaction hash: 0x...".
  const with0x = trimmed.match(/0x[0-9a-fA-F]{64}/);
  if (with0x?.[0]) return with0x[0].toLowerCase();

  const without0x = trimmed.match(/[0-9a-fA-F]{64}/);
  if (without0x?.[0]) return `0x${without0x[0].toLowerCase()}`;

  return null;
}
