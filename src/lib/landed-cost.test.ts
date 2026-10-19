/**
 * Concrete landed-cost examples for Milestone 2 Phase 1.
 * Run: npx tsx src/lib/landed-cost.test.ts
 */
import {
  computeDeliveryCosts,
  estimatedMargin,
  weightedAverageLandedCost,
} from "./landed-cost";

function assertClose(actual: number, expected: number, label: string) {
  const ok = Math.abs(actual - expected) < 0.00015;
  if (!ok) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label}: ${actual}`);
  }
}

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label}: ${actual}`);
  }
}

console.log("--- Example A: by_net_value, recoverable VAT ---");
// Product A: 10 × 5€ = 50; Product B: 5 × 10€ = 50; portes 20
// Each line gets 10 overhead. VAT 21% recoverable → not in landed.
const a = computeDeliveryCosts(
  { shippingCost: 20, otherCosts: 0, allocationMethod: "by_net_value" },
  [
    {
      key: "1",
      productId: 1,
      quantity: 10,
      unitPurchaseNet: 5,
      vatRate: 21,
      vatRecoverable: true,
    },
    {
      key: "2",
      productId: 2,
      quantity: 5,
      unitPurchaseNet: 10,
      vatRate: 21,
      vatRecoverable: true,
    },
  ],
);
assertClose(a.lines[0].allocatedOverhead, 10, "A line1 overhead");
assertClose(a.lines[1].allocatedOverhead, 10, "A line2 overhead");
assertClose(a.lines[0].landedUnitCost, 6, "A line1 landed = (50+10)/10");
assertClose(a.lines[1].landedUnitCost, 12, "A line2 landed = (50+10)/5");
assertClose(a.totals.recoverableVat, 21, "A recoverable VAT 0.21*100");
assertClose(a.totals.nonRecoverableTax, 0, "A non-rec tax");

console.log("--- Example B: by_quantity ---");
// qty 10 and 30, portes+otros = 40 → 10 and 30 allocated
const b = computeDeliveryCosts(
  { shippingCost: 30, otherCosts: 10, allocationMethod: "by_quantity" },
  [
    {
      key: "1",
      productId: 1,
      quantity: 10,
      unitPurchaseNet: 2,
      vatRate: 0,
      vatRecoverable: true,
    },
    {
      key: "2",
      productId: 2,
      quantity: 30,
      unitPurchaseNet: 2,
      vatRate: 0,
      vatRecoverable: true,
    },
  ],
);
assertClose(b.lines[0].allocatedOverhead, 10, "B line1 overhead");
assertClose(b.lines[1].allocatedOverhead, 30, "B line2 overhead");
assertClose(b.lines[0].landedUnitCost, 3, "B line1 landed (20+10)/10");
assertClose(b.lines[1].landedUnitCost, 3, "B line2 landed (60+30)/30");

console.log("--- Example C: non-recoverable tax in landed ---");
// 10 × 10€ = 100, VAT 10% non-recoverable = 10, no portes
// landed_unit = (100+0+10)/10 = 11
const c = computeDeliveryCosts(
  { shippingCost: 0, otherCosts: 0, allocationMethod: "by_net_value" },
  [
    {
      key: "1",
      productId: 1,
      quantity: 10,
      unitPurchaseNet: 10,
      vatRate: 10,
      vatRecoverable: false,
    },
  ],
);
assertClose(c.lines[0].nonRecoverableTax, 10, "C non-rec tax");
assertClose(c.lines[0].landedUnitCost, 11, "C landed with non-rec VAT");
assertClose(c.totals.recoverableVat, 0, "C recoverable");

console.log("--- Example D: weighted average ---");
// stock 10 @ 5€, receive 10 @ 7€ → WA = 6
assertClose(weightedAverageLandedCost(10, 5, 10, 7), 6, "D WA equal qty");
assertClose(weightedAverageLandedCost(0, null, 5, 8), 8, "D empty stock");
assertClose(weightedAverageLandedCost(20, 4, 10, 10), 6, "D 20@4 + 10@10");

console.log("--- Example E: beneficio estimado ---");
assertClose(estimatedMargin(14.9, 6)!, 8.9, "E margin");
assertEq(estimatedMargin(null, 6), null, "E missing sell");

if (process.exitCode) {
  console.error("\nSome assertions failed.");
  process.exit(1);
}
console.log("\nAll landed-cost examples passed.");
