import fs from "node:fs";
import path from "node:path";
import { ensureDataDirs, getDbPath } from "../lib/paths";
import { isPostgres, getDatabaseUrl } from "./dialect";

/**
 * Applies SQL migrations.
 * - Local (no DATABASE_URL): ./drizzle/*.sql on SQLite (libsql file).
 * - Hosted (DATABASE_URL): ./migrations/*.sql on Postgres (also run via scripts/migrate.mjs on build).
 */
export async function runMigrations(): Promise<void> {
  if (isPostgres()) {
    await runPostgresMigrations();
    return;
  }
  await runSqliteMigrations();
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

      try {
        for (const statement of statements) {
          await client.execute(statement);
        }
        await client.execute({
          sql: "INSERT INTO __drizzle_migrations (hash) VALUES (?)",
          args: [file],
        });
        console.log(`Applied migration: ${file}`);
      } catch (err) {
        throw err;
      }
    }

    console.log(`Database ready at ${getDbPath()}`);
  } finally {
    client.close();
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
    await client.query("select pg_advisory_lock(7272741)");
    await client.query(
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
      await client.query("begin");
      try {
        const sql = await fs.promises.readFile(
          path.join(migrationsDir, file),
          "utf8",
        );
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [
          file,
        ]);
        await client.query("commit");
        console.log(`migrate: applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
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
