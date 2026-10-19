/**
 * Phase 2 recipe cost smoke test — no stock deduction.
 * Run: npx tsx scripts/m2-phase2-integration.ts
 */
import { eq } from "drizzle-orm";
import { getDb, getSqlite } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import {
  giftBasketComponents,
  giftBaskets,
  products,
  stockMovements,
} from "../src/db/schema";
import { estimateBasketCost, resolveUnitCost } from "../src/lib/basket-cost";

runMigrations();
const db = getDb();

const p1 = db.select().from(products).where(eq(products.sku, "BODY-ML-01")).get();
const p2 = db.select().from(products).where(eq(products.sku, "PEL-CON-01")).get();
if (!p1 || !p2) {
  console.error("Need seeded products BODY-ML-01 and PEL-CON-01");
  process.exit(1);
}

const stockBefore1 = p1.currentStock;
const stockBefore2 = p2.currentStock;
const movementsBefore = db.select().from(stockMovements).all().length;

const u1 = resolveUnitCost(p1.landedCost, p1.purchaseCost);
const u2 = resolveUnitCost(p2.landedCost, p2.purchaseCost);

const basket = db
  .insert(giftBaskets)
  .values({
    name: "Cesta prueba M2-P2",
    sku: `CESTA-M2-${Date.now()}`,
    description: "Integración Phase 2",
    sellingPrice: 49.9,
    status: "active",
  })
  .returning()
  .get();

db.insert(giftBasketComponents)
  .values([
    { basketId: basket.id, productId: p1.id, quantity: 2, sortOrder: 0 },
    { basketId: basket.id, productId: p2.id, quantity: 1, sortOrder: 1 },
  ])
  .run();

const estimate = estimateBasketCost(
  [
    {
      productId: p1.id,
      quantity: 2,
      unitLandedCost: u1.missing ? null : u1.unit,
      missingCost: u1.missing,
    },
    {
      productId: p2.id,
      quantity: 1,
      unitLandedCost: u2.missing ? null : u2.unit,
      missingCost: u2.missing,
    },
  ],
  49.9,
);

const expectedTotal = Math.round((2 * u1.unit + 1 * u2.unit) * 10000) / 10000;

function check(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else console.log("OK  ", msg);
}

check(
  Math.abs(estimate.totalComponentCost - expectedTotal) < 0.0002,
  `total components ${estimate.totalComponentCost} ≈ ${expectedTotal}`,
);
check(estimate.estimatedProfit != null, "profit computed");
check(
  Math.abs((estimate.estimatedProfit ?? 0) - (49.9 - expectedTotal)) < 0.0002,
  `profit ${estimate.estimatedProfit}`,
);

// Editing recipe (update components) must not change stock/movements
db.update(giftBasketComponents)
  .set({ quantity: 3 })
  .where(eq(giftBasketComponents.basketId, basket.id))
  .run();

const after1 = db.select().from(products).where(eq(products.id, p1.id)).get()!;
const after2 = db.select().from(products).where(eq(products.id, p2.id)).get()!;
const movementsAfter = db.select().from(stockMovements).all().length;

check(after1.currentStock === stockBefore1, "p1 stock unchanged");
check(after2.currentStock === stockBefore2, "p2 stock unchanged");
check(movementsAfter === movementsBefore, "no new stock movements");

const tables = getSqlite()
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'gift_basket_assembl%'",
  )
  .all() as { name: string }[];
check(
  tables.some((t) => t.name === "gift_basket_assemblies"),
  "assembly stub table exists",
);
check(
  tables.some((t) => t.name === "gift_basket_assembly_lines"),
  "assembly lines stub exists",
);

if (process.exitCode) process.exit(1);
console.log("\nPhase 2 integration passed. Basket id:", basket.id);
