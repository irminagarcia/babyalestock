import fs from "node:fs";
import path from "node:path";
import { ensureDataDirs, getDbPath } from "../lib/paths";
import { getSqlite } from "./client";

/**
 * Applies SQL migrations from ./drizzle in filename order.
 * Tracks applied files in __drizzle_migrations.
 */
export function runMigrations(): void {
  ensureDataDirs();
  const sqlite = getSqlite();

  sqlite.exec(`
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

  const applied = new Set(
    sqlite
      .prepare("SELECT hash FROM __drizzle_migrations")
      .all()
      .map((row) => (row as { hash: string }).hash),
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    const apply = sqlite.transaction(() => {
      for (const statement of statements) {
        sqlite.exec(statement);
      }
      sqlite
        .prepare("INSERT INTO __drizzle_migrations (hash) VALUES (?)")
        .run(file);
    });
    apply();
    console.log(`Applied migration: ${file}`);
  }

  console.log(`Database ready at ${getDbPath()}`);
}

const isCli =
  typeof process.argv[1] === "string" &&
  process.argv[1].includes("migrate.ts");

if (isCli) {
  runMigrations();
}
