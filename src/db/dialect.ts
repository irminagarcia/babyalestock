/**
 * Hosted Cursor apps set DATABASE_URL (Postgres).
 * Local / LAN double-click keeps SQLite via BABYALESTOCK_DATA_DIR when unset.
 */
export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}
