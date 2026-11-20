import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { ensureDataDirs, getDbPath } from "@/lib/paths";
import * as schema from "./schema";

/**
 * `better-sqlite3` is npm-aliased to `libsql` (see package.json) so install
 * uses NAPI platform prebuilds — no Python / VS Build Tools / node-gyp on Windows.
 * API stays better-sqlite3-compatible; Drizzle + schema/migrations unchanged.
 */
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteInstance: Database.Database | null = null;

export function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    ensureDataDirs();
    sqliteInstance = new Database(getDbPath());
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
  }
  return sqliteInstance;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getSqlite(), { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
