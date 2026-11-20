/**
 * Hosted build migrate (Cursor publish-app / Cloudflare Pages).
 * Skips when DATABASE_URL is unset so local builds still pass.
 *
 * Runs ONLY after `next build` (see package.json). Do not migrate from
 * auth/getSession during Next page collection.
 *
 * Concurrent-safe: advisory lock for whole migrate + per-statement ignore
 * of 23505 (CREATE TABLE IF NOT EXISTS races on pg_type).
 */
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim() ?? "";
const files = (await readdir("migrations").catch(() => []))
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (url === "" || files.length === 0) {
  console.log("migrate: nothing to do");
  process.exit(0);
}

function isUniqueViolation(error) {
  return error && error.code === "23505";
}

function splitSqlStatements(sql) {
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

async function execIgnoreUnique(client, sql, params) {
  try {
    await client.query(sql, params);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

// Direct connection: DATABASE_URL may go through a transaction pooler.
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED?.trim() || url,
});
await client.connect();
try {
  await client.query("set lock_timeout = '60s'");
  await client.query("select pg_advisory_lock(7272741)");
  try {
    await execIgnoreUnique(
      client,
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const done = new Set(
      (await client.query("select name from schema_migrations")).rows.map(
        (r) => r.name,
      ),
    );
    for (const file of files.filter((f) => !done.has(f))) {
      const sql = await readFile(`migrations/${file}`, "utf8");
      // Autocommit per statement so a 23505 on one DDL does not abort the rest.
      for (const statement of splitSqlStatements(sql)) {
        await execIgnoreUnique(client, statement);
      }
      await execIgnoreUnique(
        client,
        "insert into schema_migrations (name) values ($1) on conflict do nothing",
        [file],
      );
      console.log(`migrate: applied ${file}`);
    }
  } finally {
    await client.query("select pg_advisory_unlock(7272741)").catch(() => {});
  }
} finally {
  await client.end();
}
