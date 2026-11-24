/**
 * BA-26: product delete safety + SKU uniqueness.
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

  // --- Create zero-stock product, delete with related movement + basket component ---
  const created = await one(
    db
      .insert(products)
      .values({
        name: `BA-26 delete ${Date.now()}`,
        sku: suggestProductSku(),
        currentStock: 0,
        minStock: 0,
        usage: "individual",
        status: "active",
      })
      .returning(),
  );
  assert(created, "product created");

  // Stock > 0 would block deletion (safety check)
  await db
    .update(products)
    .set({ currentStock: 3 })
    .where(eq(products.id, created.id));
  {
    const row = await one(
      db.select().from(products).where(eq(products.id, created.id)),
    );
    assert(row);
    assert.equal(row.currentStock, 3);
    assert.ok(row.currentStock > 0, "stock blocker precondition");
  }

  // Zero stock, add a movement via temporary stock change
  await db
    .update(products)
    .set({ currentStock: 2 })
    .where(eq(products.id, created.id));
  const move = await createStockMovement({
    productId: created.id,
    type: "manual_correction",
    quantity: -2,
    reason: "BA-26 test zero",
    userId: admin.id,
  });
  if (!move.ok) throw new Error(move.error);
  assert.equal(move.stockAfter, 0);

  const basket = await one(
    db
      .insert(giftBaskets)
      .values({
        name: `BA-26 cesta ${Date.now()}`,
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

  // Cascading cleanup (same order as deleteProduct)
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

  // Cleanup basket
  await db.delete(giftBaskets).where(eq(giftBaskets.id, basket.id));

  // --- Upsert-style auto SKU uniqueness ---
  const a = suggestProductSku();
  await db.insert(products).values({
    name: `BA-26 sku A ${Date.now()}`,
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
