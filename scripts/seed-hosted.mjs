/**
 * Idempotent seed of admin/tienda on hosted Postgres after migrate.
 * Skips when DATABASE_URL unset. Never logs password values from env.
 */
import bcrypt from "bcryptjs";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim() ?? "";
if (!url) {
  console.log("seed-hosted: nothing to do");
  process.exit(0);
}

const defaults = [
  {
    username: "admin",
    displayName: "Administración",
    password: process.env.BABYALESTOCK_ADMIN_PASSWORD || "admin123",
    role: "admin",
  },
  {
    username: "tienda",
    displayName: "Personal de tienda",
    password: process.env.BABYALESTOCK_SHOP_PASSWORD || "tienda123",
    role: "staff",
  },
];

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const u of defaults) {
    const existing = await client.query(
      "select id from users where username = $1",
      [u.username],
    );
    if (existing.rows.length > 0) {
      await client.query(
        `update users set role = $2 where username = $1 and (role is null or role = '')`,
        [u.username, u.role],
      );
      console.log(`seed-hosted: usuario ya existe: ${u.username}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await client.query(
      `insert into users (username, display_name, password_hash, role, is_active)
       values ($1, $2, $3, $4, true)`,
      [u.username, u.displayName, passwordHash, u.role],
    );
    console.log(`seed-hosted: usuario creado: ${u.username}`);
  }
} finally {
  await client.end();
}
