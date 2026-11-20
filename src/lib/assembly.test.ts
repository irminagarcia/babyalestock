/**
 * Milestone 3 assembly: consumption math, idempotency, snapshot freeze, Registrado.
 * Run: npx tsx src/lib/assembly.test.ts
 */
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { runMigrations } from "@/db/migrate";
import { getDb } from "@/db/client";
import { exec, one } from "@/db/query";
import {
  giftBasketAssemblies,
  giftBasketAssemblyLines,
  giftBasketComponents,
  giftBaskets,
  products,
  stockMovements,
  users,
} from "@/db/schema";
import {
  buildAssemblyPreview,
  computeAssemblyNeeds,
  consumeIdempotencyKey,
  freezeAssemblyLines,
  reverseIdempotencyKey,
} from "@/lib/assembly";
import {
  executeCancelAssembly,
  executeConfirmAssembly,
} from "@/lib/assembly-service";
import { sumRecordedSales, type RecordedBasketSaleRow } from "@/lib/profitability";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else console.log(`OK   ${label}`);
}

function assertClose(a: number | null, b: number | null, label: string) {
  if (a == null || b == null) {
    assert(a === b, label);
    return;
  }
  assert(Math.abs(a - b) <= 0.0002, `${label} (${a} vs ${b})`);
}

async function runTests() {
  await runMigrations();

  console.log("--- consumption math ---");
  const needs = computeAssemblyNeeds(
    [
      {
        productId: 1,
        productName: "Body",
        recipeQty: 2,
        currentStock: 10,
        landedCost: 5,
        purchaseCost: null,
      },
      {
        productId: 2,
        productName: "Caja",
        recipeQty: 1,
        currentStock: 1,
        landedCost: 1.5,
        purchaseCost: null,
      },
    ],
    3,
  );
  assert(needs[0].quantityNeeded === 6, "body qty = 2×3");
  assert(needs[0].sufficient, "body ok");
  assert(needs[1].quantityNeeded === 3, "box qty = 1×3");
  assert(!needs[1].sufficient, "box insufficient");
  assert(needs[1].shortfall === 2, "box shortfall 2");

  const previewOk = buildAssemblyPreview({
    basketId: 1,
    basketName: "Demo",
    sellingPrice: 29.9,
    quantity: 2,
    assemblyMode: "preassembled",
    components: [
      {
        productId: 1,
        productName: "Body",
        recipeQty: 2,
        currentStock: 10,
        landedCost: 5,
        purchaseCost: null,
      },
      {
        productId: 2,
        productName: "Caja",
        recipeQty: 1,
        currentStock: 5,
        landedCost: 1.5,
        purchaseCost: null,
      },
    ],
  });
  assert(previewOk.canConfirm, "preview can confirm");
  assertClose(previewOk.unitComponentCost, 11.5, "unit cost 2*5+1.5");
  assertClose(previewOk.totalComponentCost, 23, "total cost");
  assertClose(previewOk.totalRevenue, 59.8, "total revenue");

  const frozen = freezeAssemblyLines(previewOk.components);
  assert(frozen[0].quantity === 4, "frozen body consume 4");
  assertClose(frozen[0].lineCostSnapshot, 20, "frozen body line");
  assert(
    consumeIdempotencyKey(9, 3) === "assembly:9:product:3:consume",
    "consume key",
  );
  assert(
    reverseIdempotencyKey(9, 3) === "assembly:9:product:3:reverse",
    "reverse key",
  );

  console.log("--- DB: assemble + idempotency + freeze + cancel + Registrado ---");
  const db = getDb();
  const admin = await one(
    db.select().from(users).where(eq(users.username, "admin")),
  );
  if (!admin) {
    console.error("FAIL need seeded admin user");
    process.exit(1);
  }

  const suffix = Date.now().toString(36);
  const p1 = await one(
    db
      .insert(products)
      .values({
        name: `M3-A-${suffix}`,
        sku: `M3A-${suffix}`,
        currentStock: 20,
        landedCost: 4,
        purchaseCost: 3.5,
        sellingPrice: 8,
        usage: "gift_component",
        status: "active",
      })
      .returning(),
  );
  const p2 = await one(
    db
      .insert(products)
      .values({
        name: `M3-B-${suffix}`,
        sku: `M3B-${suffix}`,
        currentStock: 10,
        landedCost: 2,
        purchaseCost: 2,
        sellingPrice: 4,
        usage: "gift_component",
        status: "active",
      })
      .returning(),
  );
  if (!p1 || !p2) {
    console.error("FAIL could not create test products");
    process.exit(1);
  }

  const basket = await one(
    db
      .insert(giftBaskets)
      .values({
        name: `Cesta M3 ${suffix}`,
        sku: `CESTA-M3-${suffix}`,
        sellingPrice: 25,
        status: "active",
        assemblyMode: "preassembled",
        finishedStock: 0,
      })
      .returning(),
  );
  if (!basket) {
    console.error("FAIL could not create test basket");
    process.exit(1);
  }

  await exec(
    db.insert(giftBasketComponents).values([
      { basketId: basket.id, productId: p1.id, quantity: 2, sortOrder: 0 },
      { basketId: basket.id, productId: p2.id, quantity: 1, sortOrder: 1 },
    ]),
  );

  const key = `test-asm-${suffix}`;
  const assembledAt = new Date().toISOString();

  const failStock = await executeConfirmAssembly({
    basketId: basket.id,
    quantity: 100,
    assemblyMode: "preassembled",
    userId: admin.id,
    idempotencyKey: `${key}-fail`,
  });
  assert(!failStock.ok, "reject insufficient stock");
  assert(
    !failStock.ok &&
      !!failStock.error &&
      failStock.error.includes("insuficiente"),
    "Spanish insufficient error",
  );
  const p1AfterFail = await one(
    db.select().from(products).where(eq(products.id, p1.id)),
  );
  assert(p1AfterFail?.currentStock === 20, "no partial consume on fail");

  const ok = await executeConfirmAssembly({
    basketId: basket.id,
    quantity: 2,
    assemblyMode: "preassembled",
    userId: admin.id,
    idempotencyKey: key,
    notes: "test",
    assembledAt,
  });
  assert(ok.ok, "confirm ok");
  if (!ok.ok) process.exit(1);

  const asm = await one(
    db
      .select()
      .from(giftBasketAssemblies)
      .where(eq(giftBasketAssemblies.id, ok.assemblyId)),
  );
  if (!asm) {
    console.error("FAIL assembly row missing");
    process.exit(1);
  }
  assertClose(asm.totalComponentCostSnapshot, 10, "frozen unit cost 2*4+2");
  assertClose(asm.sellingPriceSnapshot, 25, "frozen sell");
  assert(asm.recipeNameSnapshot === basket.name, "name snapshot");
  assert(asm.assembledByUserId === admin.id, "user recorded");

  const stock1 = await one(
    db.select().from(products).where(eq(products.id, p1.id)),
  );
  const stock2 = await one(
    db.select().from(products).where(eq(products.id, p2.id)),
  );
  assert(stock1?.currentStock === 16, "p1 20-4");
  assert(stock2?.currentStock === 8, "p2 10-2");

  const finished = await one(
    db.select().from(giftBaskets).where(eq(giftBaskets.id, basket.id)),
  );
  assert(finished?.finishedStock === 2, "finished stock +2");

  const moves = (
    await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.sourceId, ok.assemblyId))
  ).filter((m) => m.sourceType === "assembly");
  assert(moves.length === 2, "two consume movements");
  assert(
    moves.every((m) => m.type === "removed"),
    "consume type removed",
  );

  const dup = await executeConfirmAssembly({
    basketId: basket.id,
    quantity: 2,
    assemblyMode: "preassembled",
    userId: admin.id,
    idempotencyKey: key,
  });
  assert(Boolean(dup.ok && dup.duplicate), "idempotent re-submit");
  const p1AfterDup = await one(
    db.select().from(products).where(eq(products.id, p1.id)),
  );
  assert(p1AfterDup?.currentStock === 16, "idempotent no double deduct");

  await exec(
    db
      .update(giftBaskets)
      .set({ name: `RENOMBRADA ${suffix}`, sellingPrice: 99 })
      .where(eq(giftBaskets.id, basket.id)),
  );
  await exec(
    db
      .update(giftBasketComponents)
      .set({ quantity: 9 })
      .where(eq(giftBasketComponents.basketId, basket.id)),
  );

  const asmAfter = await one(
    db
      .select()
      .from(giftBasketAssemblies)
      .where(eq(giftBasketAssemblies.id, ok.assemblyId)),
  );
  if (!asmAfter) process.exit(1);
  assert(
    asmAfter.recipeNameSnapshot === `Cesta M3 ${suffix}`,
    "snapshot name frozen",
  );
  assertClose(asmAfter.sellingPriceSnapshot, 25, "snapshot sell frozen");
  assertClose(asmAfter.totalComponentCostSnapshot, 10, "snapshot cost frozen");

  const lines = await db
    .select()
    .from(giftBasketAssemblyLines)
    .where(eq(giftBasketAssemblyLines.assemblyId, ok.assemblyId));
  assert(lines.every((l) => l.recipeQtyPerUnit !== 9), "line recipe qty frozen");

  const recordedRows: RecordedBasketSaleRow[] = [
    {
      assemblyId: asmAfter.id,
      basketId: basket.id,
      basketName: asmAfter.recipeNameSnapshot || "",
      quantity: asmAfter.quantity,
      assembledAt: asmAfter.assembledAt,
      costSnapshot: (asmAfter.totalComponentCostSnapshot ?? 0) * asmAfter.quantity,
      revenueSnapshot: (asmAfter.sellingPriceSnapshot ?? 0) * asmAfter.quantity,
      profit:
        (asmAfter.sellingPriceSnapshot ?? 0) * asmAfter.quantity -
        (asmAfter.totalComponentCostSnapshot ?? 0) * asmAfter.quantity,
      nature: "registrado",
    },
  ];
  const totals = sumRecordedSales(recordedRows);
  assertClose(totals.units, 2, "registrado units");
  assertClose(totals.cost, 20, "registrado cost 10*2");
  assertClose(totals.revenue, 50, "registrado revenue 25*2");
  assertClose(totals.profit, 30, "registrado profit");

  const cancel = await executeCancelAssembly({
    assemblyId: ok.assemblyId,
    userId: admin.id,
  });
  assert(cancel.ok, "cancel ok");
  const asmCancelled = await one(
    db
      .select()
      .from(giftBasketAssemblies)
      .where(eq(giftBasketAssemblies.id, ok.assemblyId)),
  );
  assert(asmCancelled?.status === "cancelled", "status cancelled");
  const p1Restored = await one(
    db.select().from(products).where(eq(products.id, p1.id)),
  );
  assert(p1Restored?.currentStock === 20, "stock restored p1");
  const p2Restored = await one(
    db.select().from(products).where(eq(products.id, p2.id)),
  );
  assert(p2Restored?.currentStock === 10, "stock restored p2");
  const basketRestored = await one(
    db.select().from(giftBaskets).where(eq(giftBaskets.id, basket.id)),
  );
  assert(basketRestored?.finishedStock === 0, "finished stock restored");

  const cancelDup = await executeCancelAssembly({
    assemblyId: ok.assemblyId,
    userId: admin.id,
  });
  assert(Boolean(cancelDup.ok && cancelDup.duplicate), "cancel idempotent");

  const mtoKey = `test-mto-${suffix}`;
  await exec(
    db
      .delete(giftBasketComponents)
      .where(eq(giftBasketComponents.basketId, basket.id)),
  );
  await exec(
    db.insert(giftBasketComponents).values([
      { basketId: basket.id, productId: p1.id, quantity: 2, sortOrder: 0 },
      { basketId: basket.id, productId: p2.id, quantity: 1, sortOrder: 1 },
    ]),
  );
  await exec(
    db.update(products).set({ currentStock: 20 }).where(eq(products.id, p1.id)),
  );
  await exec(
    db.update(products).set({ currentStock: 10 }).where(eq(products.id, p2.id)),
  );
  await exec(
    db
      .update(giftBaskets)
      .set({ finishedStock: 0 })
      .where(eq(giftBaskets.id, basket.id)),
  );

  const mto = await executeConfirmAssembly({
    basketId: basket.id,
    quantity: 1,
    assemblyMode: "mto",
    userId: admin.id,
    idempotencyKey: mtoKey,
  });
  assert(mto.ok, "mto confirm");
  const basketMto = await one(
    db.select().from(giftBaskets).where(eq(giftBaskets.id, basket.id)),
  );
  assert(basketMto?.finishedStock === 0, "mto no finished stock");
  const p1Mto = await one(
    db.select().from(products).where(eq(products.id, p1.id)),
  );
  assert(p1Mto?.currentStock === 18, "mto consumed p1");

  if (process.exitCode) {
    process.exit(1);
  }
  console.log("\nAll assembly tests passed.");
  void randomUUID;
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});