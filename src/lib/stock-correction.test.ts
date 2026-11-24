/**
 * BA-24: stock correction via manual_correction movement (absolute qty → delta).
 * Run: npx tsx src/lib/stock-correction.test.ts
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import { products, stockMovements, users } from "@/db/schema";
import { createStockMovement } from "@/lib/stock";

async function main() {
  const db = getDb();
  const admin = await one(
    db.select().from(users).where(eq(users.username, "admin")),
  );
  assert(admin, "admin user from seed");

  const created = await one(
    db
      .insert(products)
      .values({
        name: `BA-24 test ${Date.now()}`,
        currentStock: 5,
        minStock: 0,
        usage: "individual",
        status: "active",
      })
      .returning(),
  );
  assert(created, "product created");

  // Mistake on create: should be 8, not 5 → delta +3
  const up = await createStockMovement({
    productId: created.id,
    type: "manual_correction",
    quantity: 8 - 5,
    reason: "Error al dar de alta; conteo físico 8",
    userId: admin.id,
    sourceType: "product_edit",
    sourceId: created.id,
  });
  if (!up.ok) throw new Error(up.error);
  assert.equal(up.stockAfter, 8);

  const afterUp = await one(
    db.select().from(products).where(eq(products.id, created.id)),
  );
  assert.equal(afterUp?.currentStock, 8);

  // Overshot: should be 3 → delta -5
  const down = await createStockMovement({
    productId: created.id,
    type: "manual_correction",
    quantity: 3 - 8,
    reason: "Ajuste inventario",
    userId: admin.id,
    sourceType: "product_edit",
    sourceId: created.id,
  });
  if (!down.ok) throw new Error(down.error);
  assert.equal(down.stockAfter, 3);

  const moves = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, created.id));
  assert.equal(moves.length, 2);
  assert.ok(moves.every((m) => m.type === "manual_correction"));
  assert.ok(moves.every((m) => m.sourceType === "product_edit"));
  assert.ok(moves.every((m) => (m.reason || "").length > 0));

  console.log("stock-correction.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
