import fs from "node:fs";
import path from "node:path";
import { ensureDataDirs, getDbPath } from "../lib/paths";
import { isPostgres, getDatabaseUrl } from "./dialect";

/** In-process singleflight — parallel callers share one migrate. */
let migratePromise: Promise<void> | null = null;

/**
 * Applies SQL migrations.
 * - Local (no DATABASE_URL): ./drizzle/*.sql on SQLite (libsql file).
 * - Hosted (DATABASE_URL): ./migrations/*.sql on Postgres (prefer scripts/migrate.mjs
 *   after `next build` — do not call from auth during page collection).
 *
 * Concurrent-safe: process singleflight + session advisory lock for the whole
 * migrate + per-statement ignore of unique_violation (23505) from
 * CREATE TABLE IF NOT EXISTS races on pg_type.
 */
export async function runMigrations(): Promise<void> {
  if (!migratePromise) {
    migratePromise = runMigrationsInner().catch((err) => {
      migratePromise = null;
      throw err;
    });
  }
  return migratePromise;
}

async function runMigrationsInner(): Promise<void> {
  if (isPostgres()) {
    await runPostgresMigrations();
    return;
  }
  await runSqliteMigrations();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/** Split a migration file into executable statements (no function bodies in our SQL). */
export function splitSqlStatements(sql: string): string[] {
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlockComments
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

async function runSqliteMigrations(): Promise<void> {
  ensureDataDirs();
  const { createClient } = await import("@libsql/client");
  const client = createClient({ url: `file:${getDbPath()}` });

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const migrationsDir = path.join(process.cwd(), "drizzle");
    if (!fs.existsSync(migrationsDir)) {
      console.log("No drizzle/ folder yet — run npm run db:generate first.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const appliedResult = await client.execute(
      "SELECT hash FROM __drizzle_migrations",
    );
    const applied = new Set(
      appliedResult.rows.map((row) => String(row.hash)),
    );

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await client.execute(statement);
      }
      await client.execute({
        sql: "INSERT INTO __drizzle_migrations (hash) VALUES (?)",
        args: [file],
      });
      console.log(`Applied migration: ${file}`);
    }

    console.log(`Database ready at ${getDbPath()}`);
  } finally {
    client.close();
  }
}

async function execPgIgnoreUnique(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  sql: string,
  params?: unknown[],
): Promise<void> {
  try {
    await client.query(sql, params);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

async function runPostgresMigrations(): Promise<void> {
  const url = getDatabaseUrl();
  if (!url) {
    console.log("migrate: DATABASE_URL unset — skip");
    return;
  }

  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString:
      process.env.DATABASE_URL_UNPOOLED?.trim() || url,
  });
  await client.connect();

  try {
    await client.query("set lock_timeout = '60s'");
    // Session lock held for the whole migrate (including CREATE TABLE).
    // Needs a direct / session-mode connection (DATABASE_URL_UNPOOLED).
    await client.query("select pg_advisory_lock(7272741)");
    try {
      await execPgIgnoreUnique(
        client,
        "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
      );

      const migrationsDir = path.join(process.cwd(), "migrations");
      const files = (
        await fs.promises.readdir(migrationsDir).catch(() => [] as string[])
      )
        .filter((f) => f.endsWith(".sql"))
        .sort();

      if (files.length === 0) {
        console.log("migrate: no migrations/*.sql files");
        return;
      }

      const done = new Set(
        (await client.query("select name from schema_migrations")).rows.map(
          (r: { name: string }) => r.name,
        ),
      );

      for (const file of files.filter((f) => !done.has(f))) {
        const sql = await fs.promises.readFile(
          path.join(migrationsDir, file),
          "utf8",
        );
        // Autocommit per statement so a 23505 on one DDL does not abort the rest.
        for (const statement of splitSqlStatements(sql)) {
          await execPgIgnoreUnique(client, statement);
        }
        await execPgIgnoreUnique(
          client,
          "insert into schema_migrations (name) values ($1) on conflict do nothing",
          [file],
        );
        console.log(`migrate: applied ${file}`);
      }
    } finally {
      await client.query("select pg_advisory_unlock(7272741)").catch(() => {
        /* connection may already be dead */
      });
    }
  } finally {
    await client.end();
  }
}

const isCli =
  typeof process.argv[1] === "string" &&
  process.argv[1].includes("migrate.ts");

if (isCli) {
  runMigrations()
    .then(() => {
      /* ok */
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
