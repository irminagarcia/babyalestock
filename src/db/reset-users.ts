/**
 * Restablece las contraseñas de admin y tienda a los valores por defecto
 * (o a BABYALESTOCK_ADMIN_PASSWORD / BABYALESTOCK_SHOP_PASSWORD si existen).
 *
 * Uso (en la carpeta del proyecto):
 *   npm run reset-users
 *
 * No borra productos ni stock; solo usuarios de acceso.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { runMigrations } from "./migrate";
import { getDb } from "./client";
import { exec, one } from "./query";
import { users } from "./schema";
import { getDbPath } from "../lib/paths";

const DEFAULTS = [
  {
    username: "admin",
    displayName: "Administración",
    password: process.env.BABYALESTOCK_ADMIN_PASSWORD || "admin123",
  },
  {
    username: "tienda",
    displayName: "Personal de tienda",
    password: process.env.BABYALESTOCK_SHOP_PASSWORD || "tienda123",
  },
] as const;

async function resetUsers() {
  console.log("");
  console.log("=== Baby Ale — restablecer usuarios ===");
  console.log(`Base de datos: ${getDbPath()}`);
  console.log("");

  await runMigrations();
  const db = getDb();

  for (const u of DEFAULTS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const existing = await one(
      db.select().from(users).where(eq(users.username, u.username)),
    );

    if (!existing) {
      await exec(
        db.insert(users).values({
          username: u.username,
          displayName: u.displayName,
          passwordHash,
          isActive: true,
        }),
      );
      console.log(`✓ Creado: ${u.username} / ${u.password}`);
    } else {
      await exec(
        db
          .update(users)
          .set({
            passwordHash,
            displayName: u.displayName,
            isActive: true,
          })
          .where(eq(users.username, u.username)),
      );
      console.log(`✓ Restablecido: ${u.username} / ${u.password}`);
    }

    const row = await one(
      db.select().from(users).where(eq(users.username, u.username)),
    );
    if (!row) {
      throw new Error(`No se pudo guardar el usuario ${u.username}`);
    }
    const ok = await bcrypt.compare(u.password, row.passwordHash);
    if (!ok) {
      throw new Error(
        `La contraseña de ${u.username} no se verificó tras guardar. Revise la base de datos.`,
      );
    }
  }

  console.log("");
  console.log("Listo. Entráis con:");
  for (const u of DEFAULTS) {
    console.log(`  ${u.username.padEnd(6)} / ${u.password}`);
  }
  if (
    !process.env.BABYALESTOCK_ADMIN_PASSWORD &&
    !process.env.BABYALESTOCK_SHOP_PASSWORD
  ) {
    console.log("(valores por defecto; cambiadlas luego en la app)");
  } else {
    console.log("(según variables de entorno usadas en este comando)");
  }
  console.log("");
  console.log("Luego arrancad la app y abrid: http://127.0.0.1:43123");
  console.log("Desde el otro PC (LAN): http://babyalestock:43123");
  console.log("Si falla el login, cerrad la app, volved a ejecutar");
  console.log("  npm run reset-users");
  console.log("y arrancad de nuevo.");
  console.log("");
}

resetUsers().catch((err) => {
  console.error("");
  console.error("ERROR al restablecer usuarios:");
  console.error(err);
  console.error("");
  process.exit(1);
});