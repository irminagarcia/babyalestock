import { ensureDataDirs, getDbPath } from "@/lib/paths";
import { isPostgres, getDatabaseUrl } from "./dialect";
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";

type LibsqlDb = import("drizzle-orm/libsql").LibSQLDatabase<typeof sqliteSchema>;
type NeonDb = import("drizzle-orm/neon-serverless").NeonDatabase<typeof pgSchema>;

/**
 * App-facing Drizzle handle. Runtime may be libsql (local) or Neon/Postgres
 * (hosted Workers). Tables are exported from `@/db/schema` with SQLite-shaped
 * types for a single TS surface.
 */
export type Db = LibsqlDb;
export type Tx = Parameters<Parameters<LibsqlDb["transaction"]>[0]>[0];

let dbInstance: Db | null = null;
let libsqlClient: { close: () => void } | null = null;
let neonPool: { end: () => Promise<void> } | null = null;

function createSqliteDb(): LibsqlDb {
  // Lazy require so Cloudflare Workers bundles do not pull native libsql.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/libsql") as typeof import("drizzle-orm/libsql");
  ensureDataDirs();
  libsqlClient = createClient({ url: `file:${getDbPath()}` });
  return drizzle(libsqlClient as import("@libsql/client").Client, {
    schema: sqliteSchema,
  });
}

function createNeonDb(): NeonDb {
  // Neon serverless (WebSocket) works on Cloudflare Workers; plain `pg` TCP does not.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool, neonConfig } =
    require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } =
    require("drizzle-orm/neon-serverless") as typeof import("drizzle-orm/neon-serverless");

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Postgres mode");
  }

  if (typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket;
  }

  const pool = new Pool({ connectionString });
  neonPool = pool;
  return drizzle(pool, { schema: pgSchema });
}

export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = (isPostgres() ? createNeonDb() : createSqliteDb()) as Db;
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
  if (neonPool) {
    await neonPool.end();
    neonPool = null;
  }
}
