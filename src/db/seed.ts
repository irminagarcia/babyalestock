import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { runMigrations } from "./migrate";
import { getDb } from "./client";
import { categories, products, subcategories, suppliers, users } from "./schema";
import { getDbPath } from "../lib/paths";

async function ensureUser(opts: {
  username: string;
  displayName: string;
  password: string;
}): Promise<void> {
  const db = getDb();
  const existing = db
    .select()
    .from(users)
    .where(eq(users.username, opts.username))
    .get();

  if (existing) {
    // Re-activate if someone disabled the account; do not overwrite passwords
    // on normal seed (use `npm run reset-users` to force defaults).
    if (!existing.isActive) {
      db.update(users)
        .set({ isActive: true })
        .where(eq(users.username, opts.username))
        .run();
      console.log(`Usuario reactivado: ${opts.username}`);
    } else {
      console.log(`Usuario ya existe: ${opts.username}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(opts.password, 10);
  db.insert(users)
    .values({
      username: opts.username,
      displayName: opts.displayName,
      passwordHash,
      isActive: true,
    })
    .run();

  const row = db
    .select()
    .from(users)
    .where(eq(users.username, opts.username))
    .get();
  if (!row) {
    throw new Error(
      `No se pudo crear el usuario ${opts.username} en ${getDbPath()}`,
    );
  }
  const ok = await bcrypt.compare(opts.password, row.passwordHash);
  if (!ok) {
    throw new Error(
      `Usuario ${opts.username} creado pero la contraseña no verifica. Ejecute: npm run reset-users`,
    );
  }
  console.log(`Usuario creado: ${opts.username}`);
}

async function seed() {
  console.log(`Sembrando base de datos: ${getDbPath()}`);
  runMigrations();
  const db = getDb();

  const defaultUsers = [
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
  ];

  for (const u of defaultUsers) {
    await ensureUser(u);
  }

  const sampleCategories = [
    {
      name: "Ropa",
      description: "Prendas para bebé",
      subs: ["Bodies", "Pijamas", "Abrigos"],
    },
    {
      name: "Higiene",
      description: "Cuidado e higiene",
      subs: ["Pañales", "Cremas", "Toallitas"],
    },
    {
      name: "Juguetes",
      description: "Juguetes y peluches",
      subs: ["Peluches", "Estimulación"],
    },
    {
      name: "Accesorios",
      description: "Complementos",
      subs: ["Chupetes", "Biberones"],
    },
  ];

  for (const cat of sampleCategories) {
    let row = db
      .select()
      .from(categories)
      .where(eq(categories.name, cat.name))
      .get();
    if (!row) {
      row = db
        .insert(categories)
        .values({ name: cat.name, description: cat.description })
        .returning()
        .get();
    }
    for (const sub of cat.subs) {
      const exists = db
        .select()
        .from(subcategories)
        .where(eq(subcategories.name, sub))
        .all()
        .find((s) => s.categoryId === row!.id);
      if (!exists) {
        db.insert(subcategories)
          .values({ categoryId: row.id, name: sub })
          .run();
      }
    }
  }

  const sampleSuppliers = ["Baby Soft S.L.", "Dulce Infancia", "Mimo & Co."];
  for (const name of sampleSuppliers) {
    const exists = db
      .select()
      .from(suppliers)
      .where(eq(suppliers.name, name))
      .get();
    if (!exists) {
      db.insert(suppliers).values({ name }).run();
    }
  }

  const sampleProducts = [
    {
      name: "Body manga larga algodón orgánico",
      sku: "BODY-ML-01",
      brand: "Baby Soft",
      size: "3-6 M",
      color: "Crudo",
      purchaseCost: 6.5,
      sellingPrice: 14.9,
      currentStock: 12,
      minStock: 4,
      usage: "both" as const,
      categoryName: "Ropa",
      subcategoryName: "Bodies",
      supplierName: "Baby Soft S.L.",
      storageLocation: "Estantería A1",
    },
    {
      name: "Peluche conejo gris",
      sku: "PEL-CON-01",
      brand: "Mimo & Co.",
      purchaseCost: 8,
      sellingPrice: 19.5,
      currentStock: 2,
      minStock: 3,
      usage: "both" as const,
      categoryName: "Juguetes",
      subcategoryName: "Peluches",
      supplierName: "Mimo & Co.",
      storageLocation: "Estantería B2",
    },
    {
      name: "Pack toallitas sensibles (60 uds)",
      sku: "HIG-TOA-60",
      brand: "Dulce Infancia",
      purchaseCost: 2.1,
      sellingPrice: 4.5,
      currentStock: 0,
      minStock: 6,
      usage: "individual" as const,
      categoryName: "Higiene",
      subcategoryName: "Toallitas",
      supplierName: "Dulce Infancia",
      storageLocation: "Almacén suelo",
    },
  ];

  for (const sample of sampleProducts) {
    const exists = db
      .select()
      .from(products)
      .where(eq(products.sku, sample.sku))
      .get();
    if (exists) continue;

    const cat = db
      .select()
      .from(categories)
      .where(eq(categories.name, sample.categoryName))
      .get();
    const sub = cat
      ? db
          .select()
          .from(subcategories)
          .all()
          .find(
            (s) =>
              s.categoryId === cat.id && s.name === sample.subcategoryName,
          )
      : undefined;
    const sup = db
      .select()
      .from(suppliers)
      .where(eq(suppliers.name, sample.supplierName))
      .get();

    db.insert(products)
      .values({
        name: sample.name,
        sku: sample.sku,
        brand: sample.brand,
        size: sample.size ?? null,
        color: sample.color ?? null,
        purchaseCost: sample.purchaseCost,
        sellingPrice: sample.sellingPrice,
        currentStock: sample.currentStock,
        minStock: sample.minStock,
        usage: sample.usage,
        categoryId: cat?.id ?? null,
        subcategoryId: sub?.id ?? null,
        supplierId: sup?.id ?? null,
        storageLocation: sample.storageLocation,
        status: "active",
      })
      .run();
  }

  console.log("Semilla completada.");
  console.log(`Base de datos: ${getDbPath()}`);
  console.log("Usuarios por defecto: admin / admin123  y  tienda / tienda123");
  console.log(
    "(Contraseñas iniciales: BABYALESTOCK_ADMIN_PASSWORD / BABYALESTOCK_SHOP_PASSWORD al sembrar.)",
  );
  console.log(
    "Si el login falla: npm run reset-users  (restablece admin/tienda sin borrar stock).",
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
