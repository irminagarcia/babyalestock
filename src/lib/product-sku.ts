/**
 * Auto SKU helpers for product create (BA-26).
 * Format: BA-XXXXXX (A–Z / 0–9). Unique among products.sku.
 */

const SKU_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function formatProductSku(suffix: string): string {
  return `BA-${suffix.toUpperCase()}`;
}

/** Browser / Node: random 6-char suffix for a suggested SKU. */
export function suggestProductSku(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const b of bytes) {
    suffix += SKU_ALPHABET[b % SKU_ALPHABET.length];
  }
  return formatProductSku(suffix);
}
