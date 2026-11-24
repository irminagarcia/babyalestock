/**
 * Idempotent hosted (Neon) DDL that build-time migrate.mjs may have skipped
 * when DATABASE_URL was only a Worker *runtime* secret, not a build secret.
 *
 * Mirrors migrations/002_supplier_fiscal_fields.sql (+ 003 role if missing).
 * Safe to call on every request; runs once per isolate.
 */
import {
  getDatabaseUrl,
  isCloudflareWorkerRuntime,
  isPostgres,
} from "./dialect";

let ensurePromise: Promise<{ supplierFiscal: boolean; userRole: boolean }> | null =
  null;

const ENSURE_STATEMENTS = [
  // 002 — supplier fiscal
  "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id TEXT",
  "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legal_name TEXT",
  "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS fiscal_address TEXT",
  "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'España'",
  // 003 — user role
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff'",
  // Track so build migrate stays aligned
  `CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
  `INSERT INTO schema_migrations (name) VALUES ('002_supplier_fiscal_fields.sql')
    ON CONFLICT DO NOTHING`,
  `INSERT INTO schema_migrations (name) VALUES ('003_user_role.sql')
    ON CONFLICT DO NOTHING`,
] as const;

async function runEnsure(): Promise<{
  supplierFiscal: boolean;
  userRole: boolean;
}> {
  if (!isPostgres()) {
    return { supplierFiscal: false, userRole: false };
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    // Workers without URL: nothing we can do here (health already reports).
    if (isCloudflareWorkerRuntime()) {
      throw new Error(
        "Falta DATABASE_URL (Neon) para aplicar columnas fiscales de proveedores.",
      );
    }
    return { supplierFiscal: false, userRole: false };
  }

  // Same neon-serverless Pool path as getDb() — works on Workers.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool, neonConfig } =
    require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
  if (typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket;
  }
  neonConfig.poolQueryViaFetch = true;

  const pool = new Pool({ connectionString });
  try {
    for (const statement of ENSURE_STATEMENTS) {
      await pool.query(statement);
    }
  } finally {
    await pool.end().catch(() => {});
  }

  return { supplierFiscal: true, userRole: true };
}

/** Await before any query that needs supplier fiscal columns or user.role. */
export function ensureHostedSchema(): Promise<{
  supplierFiscal: boolean;
  userRole: boolean;
}> {
  if (!isPostgres()) {
    return Promise.resolve({ supplierFiscal: false, userRole: false });
  }
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((err) => {
      // Allow retry on next request if Neon was briefly unreachable.
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
