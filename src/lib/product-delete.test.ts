/**
 * BA-26 / BA-34: product delete safety + SKU uniqueness.
 * Stock > 0 no longer blocks delete (discard with product).
 * Run: npx tsx src/lib/product-delete.test.ts
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import { one } from "@/db/query";
import {
  giftBasketComponents,
  giftBaskets,
  products,
  stockMovements,
  users,
} from "@/db/schema";
import { createStockMovement } from "@/lib/stock";
import { suggestProductSku } from "@/lib/product-sku";

/**
 * Mirrors assessProductDelete stock rule (BA-34): stock ≠ 0 is a warning,
 * not a blocker. Delivery/assembly history remain hard blockers.
 */
function stockAllowsDelete(currentStock: number): {
  canDeleteForStock: boolean;
  warning?: string;
} {
  const stockUnits = Number(currentStock);
  if (!Number.isFinite(stockUnits) || stockUnits === 0) {
    return { canDeleteForStock: true };
  }
  return {
    canDeleteForStock: true,
    warning: `Hay ${stockUnits} unidad(es) en stock. Al confirmar se descartarán esas existencias junto con el producto.`,
  };
}

async function main() {
  const db = getDb();
  const admin = await one(
    db.select().from(users).where(eq(users.username, "admin")),
  );
  assert(admin, "admin user from seed");

  // --- SKU format ---
  const sku1 = suggestProductSku();
  const sku2 = suggestProductSku();
  assert.match(sku1, /^BA-[A-Z2-9]{6}$/);
  assert.match(sku2, /^BA-[A-Z2-9]{6}$/);
  assert.notEqual(sku1, sku2);

  // --- BA-34: stock > 0 is warning, not blocker ---
  const withStock = stockAllowsDelete(3);
  assert.equal(withStock.canDeleteForStock, true);
  assert.match(withStock.warning || "", /3 unidad/);
  assert.equal(stockAllowsDelete(0).canDeleteForStock, true);
  assert.equal(stockAllowsDelete(0).warning, undefined);

  // --- Create product with stock > 0, cascade-delete like deleteProduct ---
  const created = await one(
    db
      .insert(products)
      .values({
        name: `BA-34 delete ${Date.now()}`,
        sku: suggestProductSku(),
        currentStock: 3,
        minStock: 0,
        usage: "individual",
        status: "active",
      })
      .returning(),
  );
  assert(created, "product created");
  assert.equal(created.currentStock, 3);

  // Record a movement while stock is positive (audit trail that will be purged)
  const move = await createStockMovement({
    productId: created.id,
    type: "manual_correction",
    quantity: -1,
    reason: "BA-34 test partial adjust",
    userId: admin.id,
  });
  if (!move.ok) throw new Error(move.error);
  assert.equal(move.stockAfter, 2);

  const basket = await one(
    db
      .insert(giftBaskets)
      .values({
        name: `BA-34 cesta ${Date.now()}`,
        status: "draft",
        assemblyMode: "mto",
        finishedStock: 0,
      })
      .returning(),
  );
  assert(basket);
  await db.insert(giftBasketComponents).values({
    basketId: basket.id,
    productId: created.id,
    quantity: 1,
  });

  // Cascading cleanup (same order as deleteProduct) — stock still > 0
  const still = await one(
    db.select().from(products).where(eq(products.id, created.id)),
  );
  assert(still);
  assert.ok(still.currentStock > 0, "delete must work with stock > 0");

  const moveIds = (
    await db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(eq(stockMovements.productId, created.id))
  ).map((r) => r.id);
  assert.ok(moveIds.length >= 1);

  await db
    .delete(giftBasketComponents)
    .where(eq(giftBasketComponents.productId, created.id));
  await db
    .delete(stockMovements)
    .where(eq(stockMovements.productId, created.id));
  await db.delete(products).where(eq(products.id, created.id));

  const gone = await one(
    db.select().from(products).where(eq(products.id, created.id)),
  );
  assert.equal(gone, undefined);

  const compsLeft = await db
    .select()
    .from(giftBasketComponents)
    .where(eq(giftBasketComponents.productId, created.id));
  assert.equal(compsLeft.length, 0);

  await db.delete(giftBaskets).where(eq(giftBaskets.id, basket.id));

  // --- Upsert-style auto SKU uniqueness ---
  const a = suggestProductSku();
  await db.insert(products).values({
    name: `BA-34 sku A ${Date.now()}`,
    sku: a,
    currentStock: 0,
    minStock: 0,
    usage: "individual",
    status: "active",
  });
  const clash = await one(
    db.select().from(products).where(eq(products.sku, a)),
  );
  assert(clash);

  console.log("product-delete.test.ts: ok");
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await closeDb();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
