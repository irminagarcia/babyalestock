import { getDb, type Db, type Tx } from "./client";

/** First row or undefined (both dialects are async). */
export async function one<T>(q: Promise<T[]>): Promise<T | undefined> {
  const result = await q;
  return result[0];
}

/** All rows. */
export async function rows<T>(q: Promise<T[]>): Promise<T[]> {
  return q;
}

/** Insert/update/delete. */
export async function exec(q: Promise<unknown>): Promise<void> {
  await q;
}

/**
 * Dialect-agnostic transaction. Use `tx` for nested writes (e.g. stock movements).
 */
export async function withTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => fn(tx));
}

export type { Db, Tx };
