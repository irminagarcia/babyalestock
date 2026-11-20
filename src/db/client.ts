import { createClient, type Client } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ensureDataDirs, getDbPath } from "@/lib/paths";
import { isPostgres, getDatabaseUrl } from "./dialect";
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";

type LibsqlDb = ReturnType<typeof drizzleLibsql<typeof sqliteSchema>>;
type PgDb = ReturnType<typeof drizzlePg<typeof pgSchema>>;

/**
 * App-facing Drizzle handle. Runtime may be libsql or Postgres; tables are
 * exported from `@/db/schema` with SQLite-shaped types for a single TS surface.
 */
export type Db = LibsqlDb;
export type Tx = Parameters<Parameters<LibsqlDb["transaction"]>[0]>[0];

let dbInstance: Db | null = null;
let libsqlClient: Client | null = null;
let pgPool: pg.Pool | null = null;

function createSqliteDb(): LibsqlDb {
  ensureDataDirs();
  libsqlClient = createClient({ url: `file:${getDbPath()}` });
  return drizzleLibsql(libsqlClient, { schema: sqliteSchema });
}

function createPgDb(): PgDb {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Postgres mode");
  }
  pgPool = new pg.Pool({ connectionString, max: 5 });
  return drizzlePg(pgPool, { schema: pgSchema });
}

export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = (isPostgres() ? createPgDb() : createSqliteDb()) as Db;
  }
  return dbInstance;
}

export function usingPostgres(): boolean {
  return isPostgres();
}

export async function closeDb(): Promise<void> {
  dbInstance = null;
  if (libsqlClient) {
    libsqlClient.close();
    libsqlClient = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}
