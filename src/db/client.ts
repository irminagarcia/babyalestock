import { ensureDataDirs, getDbPath } from "@/lib/paths";
import {
  isPostgres,
  getDatabaseUrl,
  syncHostedDatabaseUrlFromBindings,
  isCloudflareWorkerRuntime,
} from "./dialect";
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

const WORKERS_DB_HINT =
  "Falta el secreto DATABASE_URL (Neon) en el Worker. Cloudflare → babyalestock → Settings → Variables and Secrets → Production → DATABASE_URL. Luego Deploy latest main (no uses Retry de un deploy viejo). Mientras tanto: Versions → rollback a 50d1c6e9.";

function createSqliteDb(): LibsqlDb {
  // Hard gate: never invoke libsql createClient on workerd (crash: _createClient3).
  if (isCloudflareWorkerRuntime()) {
    throw new Error(WORKERS_DB_HINT);
  }
  // Lazy require so Cloudflare Workers bundles do not pull native libsql at init.
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
    throw new Error(WORKERS_DB_HINT);
  }

  // Required on Cloudflare Workers / workerd for neon-serverless Pool.
  // Use the runtime WebSocket (nodejs_compat / workerd) — do NOT pull Node `ws`.
  if (typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket;
  }
  // IMPORTANT: do not set poolQueryViaFetch=true. Fetch/HTTP mode cannot run
  // interactive transactions (stock movements, category/product deletes). That
  // caused live "error but write stuck / succeeded oddly" bugs on Workers.
  // maxUses:1 avoids CF Workers Pool client-reuse hangs while keeping WebSockets.
  const pool = new Pool({ connectionString, maxUses: 1 });
  neonPool = pool;
  return drizzle(pool, { schema: pgSchema });
}

export function getDb(): Db {
  if (!dbInstance) {
    syncHostedDatabaseUrlFromBindings();
    // Workers → always Neon. Local without DATABASE_URL → SQLite.
    if (isPostgres() || isCloudflareWorkerRuntime()) {
      dbInstance = createNeonDb() as unknown as Db;
    } else {
      dbInstance = createSqliteDb();
    }
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
