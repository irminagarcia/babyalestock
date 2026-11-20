/**
 * Hosted build migrate (Cursor publish-app / Cloudflare Pages).
 * Skips when DATABASE_URL is unset so local builds still pass.
 *
 * Concurrent-safe: advisory lock for whole migrate + ignore 23505 from
 * CREATE TABLE IF NOT EXISTS races on pg_type.
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

// Direct connection: DATABASE_URL may go through a transaction pooler.
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED?.trim() || url,
});
await client.connect();
try {
  await client.query("set lock_timeout = '60s'");
  await client.query("select pg_advisory_lock(7272741)");
  try {
    try {
      await client.query(
        "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    const done = new Set(
      (await client.query("select name from schema_migrations")).rows.map(
        (r) => r.name,
      ),
    );
    for (const file of files.filter((f) => !done.has(f))) {
      await client.query("begin");
      try {
        await client.query(await readFile(`migrations/${file}`, "utf8"));
        await client.query(
          "insert into schema_migrations (name) values ($1) on conflict do nothing",
          [file],
        );
        await client.query("commit");
        console.log(`migrate: applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        if (!isUniqueViolation(error)) throw error;
        await client.query(
          "insert into schema_migrations (name) values ($1) on conflict do nothing",
          [file],
        );
        console.log(`migrate: ${file} concurrent — treated as applied`);
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock(7272741)").catch(() => {});
  }
} finally {
  await client.end();
}
