export function normalizeTxHash(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const without0x = trimmed.toLowerCase().replace(/0x/g, '');
  const hex = without0x.replace(/[^0-9a-f]/g, '');
  if (!hex) return null;

  return `0x${hex}`;
}

