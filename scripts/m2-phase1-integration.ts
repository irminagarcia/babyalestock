/**
 * End-to-end landed-cost + stock receive smoke test against local SQLite.
 * Run: npx tsx scripts/m2-phase1-integration.ts
 */
import { eq } from "drizzle-orm";
import { getDb, getSqlite } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import {
  products,
  supplierDeliveries,
  supplierDeliveryLines,
  suppliers,
  stockMovements,
  users,
} from "../src/db/schema";
import { computeDeliveryCosts, weightedAverageLandedCost } from "../src/lib/landed-cost";
import { createStockMovement } from "../src/lib/stock";

runMigrations();
const db = getDb();
const sqlite = getSqlite();

const user = db.select().from(users).where(eq(users.username, "admin")).get();
if (!user) throw new Error("Missing admin user — run npm run db:seed");

const supplier =
  db.select().from(suppliers).all()[0] ||
  db.insert(suppliers).values({ name: "Test Supplier M2" }).returning().get();

const p1 =
  db.select().from(products).where(eq(products.sku, "BODY-ML-01")).get() ||
  db
    .insert(products)
    .values({
      name: "Test body",
      sku: "M2-P1",
      purchaseCost: 5,
      sellingPrice: 15,
      currentStock: 10,
      landedCost: 5,
      status: "active",
    })
    .returning()
    .get();

const p2 =
  db.select().from(products).where(eq(products.sku, "PEL-CON-01")).get() ||
  db
    .insert(products)
    .values({
      name: "Test peluche",
      sku: "M2-P2",
      purchaseCost: 8,
      sellingPrice: 20,
      currentStock: 2,
      landedCost: 8,
      status: "active",
    })
    .returning()
    .get();

const stockBefore1 = p1.currentStock;
const stockBefore2 = p2.currentStock;
const oldLanded1 = p1.landedCost ?? p1.purchaseCost ?? 0;
const oldLanded2 = p2.landedCost ?? p2.purchaseCost ?? 0;

const header = {
  shippingCost: 20,
  otherCosts: 0,
  allocationMethod: "by_net_value" as const,
};

const lineInputs = [
  {
    key: "a",
    productId: p1.id,
    quantity: 10,
    unitPurchaseNet: 5,
    vatRate: 21,
    vatRecoverable: true,
  },
  {
    key: "b",
    productId: p2.id,
    quantity: 5,
    unitPurchaseNet: 10,
    vatRate: 21,
    vatRecoverable: true,
  },
];

const computed = computeDeliveryCosts(header, lineInputs);
console.log("Computed lines:", computed.lines.map((l) => ({
  productId: l.productId,
  overhead: l.allocatedOverhead,
  landed: l.landedUnitCost,
})));

const delivery = db
  .insert(supplierDeliveries)
  .values({
    supplierId: supplier.id,
    deliveryDate: new Date().toISOString().slice(0, 10),
    reference: "M2-TEST-ALB",
    shippingCost: 20,
    otherCosts: 0,
    allocationMethod: "by_net_value",
    status: "draft",
    createdByUserId: user.id,
  })
  .returning()
  .get();

const insertedLines = computed.lines.map((line, sortOrder) =>
  db
    .insert(supplierDeliveryLines)
    .values({
      deliveryId: delivery.id,
      productId: line.productId,
      quantity: line.quantity,
      unitPurchaseNet: line.unitPurchaseNet,
      vatRate: line.vatRate,
      vatRecoverable: line.vatRecoverable,
      lineNet: line.lineNet,
      vatAmount: line.vatAmount,
      allocatedOverhead: line.allocatedOverhead,
      nonRecoverableTax: line.nonRecoverableTax,
      landedUnitCost: line.landedUnitCost,
      sortOrder,
    })
    .returning()
    .get(),
);

sqlite.transaction(() => {
  for (const line of insertedLines) {
    const c = computed.lines.find((x) => x.productId === line.productId)!;
    const product = db.select().from(products).where(eq(products.id, line.productId)).get()!;
    const before = product.currentStock;
    const old = product.landedCost ?? product.purchaseCost;
    const mv = createStockMovement({
      productId: line.productId,
      type: "received",
      quantity: line.quantity,
      reason: `Entrada de proveedor #${delivery.id}`,
      userId: user.id,
      idempotencyKey: `delivery:${delivery.id}:line:${line.id}:received`,
      sourceType: "delivery_line",
      sourceId: line.id,
      skipTransaction: true,
    });
    if (!mv.ok) throw new Error(mv.error);
    const wa = weightedAverageLandedCost(before, old, line.quantity, c.landedUnitCost);
    db.update(products)
      .set({
        purchaseCost: c.unitPurchaseNet,
        landedCost: wa,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, line.productId))
      .run();
    db.update(supplierDeliveryLines)
      .set({ stockMovementId: mv.movementId })
      .where(eq(supplierDeliveryLines.id, line.id))
      .run();
  }
  db.update(supplierDeliveries)
    .set({
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      confirmedByUserId: user.id,
    })
    .where(eq(supplierDeliveries.id, delivery.id))
    .run();
})();

// Idempotency: second receive with same key must not double stock
const again = createStockMovement({
  productId: p1.id,
  type: "received",
  quantity: 10,
  userId: user.id,
  idempotencyKey: `delivery:${delivery.id}:line:${insertedLines[0].id}:received`,
});
if (!again.ok || !again.duplicate) {
  console.error("FAIL idempotency", again);
  process.exit(1);
}

const after1 = db.select().from(products).where(eq(products.id, p1.id)).get()!;
const after2 = db.select().from(products).where(eq(products.id, p2.id)).get()!;
const expectedWA1 = weightedAverageLandedCost(
  stockBefore1,
  oldLanded1,
  10,
  computed.lines[0].landedUnitCost,
);
const expectedWA2 = weightedAverageLandedCost(
  stockBefore2,
  oldLanded2,
  5,
  computed.lines[1].landedUnitCost,
);

function check(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("OK  ", msg);
  }
}

check(after1.currentStock === stockBefore1 + 10, `p1 stock ${stockBefore1}→${after1.currentStock}`);
check(after2.currentStock === stockBefore2 + 5, `p2 stock ${stockBefore2}→${after2.currentStock}`);
check(Math.abs((after1.landedCost ?? 0) - expectedWA1) < 0.0002, `p1 WA landed ${after1.landedCost} ≈ ${expectedWA1}`);
check(Math.abs((after2.landedCost ?? 0) - expectedWA2) < 0.0002, `p2 WA landed ${after2.landedCost} ≈ ${expectedWA2}`);
check(computed.lines[0].landedUnitCost === 6, "line1 landed unit 6");
check(computed.lines[1].landedUnitCost === 12, "line2 landed unit 12");

const mvCount = db
  .select()
  .from(stockMovements)
  .where(eq(stockMovements.sourceType, "delivery_line"))
  .all()
  .filter((m) => insertedLines.some((l) => l.id === m.sourceId)).length;
check(mvCount === 2, `two delivery_line movements (${mvCount})`);

if (process.exitCode) process.exit(1);
console.log("\nIntegration smoke passed. Delivery id:", delivery.id);
