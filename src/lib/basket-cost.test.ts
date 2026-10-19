/**
 * Basket recipe cost examples — Phase 2.
 * Run: npx tsx src/lib/basket-cost.test.ts
 */
import { estimateBasketCost, resolveUnitCost } from "./basket-cost";

function assertClose(actual: number | null, expected: number | null, label: string) {
  if (actual == null || expected == null) {
    if (actual === expected) {
      console.log(`OK   ${label}: null`);
      return;
    }
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
    process.exitCode = 1;
    return;
  }
  if (Math.abs(actual - expected) > 0.0002) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label}: ${actual}`);
  }
}

console.log("--- resolveUnitCost ---");
assertClose(resolveUnitCost(6.28, 5).unit, 6.28, "prefer landed");
assertClose(resolveUnitCost(null, 5).unit, 5, "fallback purchase");
{
  const r = resolveUnitCost(null, null);
  assertClose(r.unit, 0, "missing → 0");
  if (!r.missing) {
    console.error("FAIL missing flag");
    process.exitCode = 1;
  } else console.log("OK   missing flag");
}

console.log("--- Example A: two components ---");
// Body 2×6€ + packaging 1×1€ = 13; sell 29.9 → profit 16.9, margin ~56.52%
const a = estimateBasketCost(
  [
    { productId: 1, quantity: 2, unitLandedCost: 6 },
    { productId: 2, quantity: 1, unitLandedCost: 1 },
  ],
  29.9,
);
assertClose(a.totalComponentCost, 13, "A total components");
assertClose(a.estimatedProfit, 16.9, "A profit");
assertClose(a.estimatedMarginPct, 56.5217, "A margin %");

console.log("--- Example B: live estimate changes with landed ---");
const b1 = estimateBasketCost(
  [{ productId: 1, quantity: 10, unitLandedCost: 5 }],
  100,
);
const b2 = estimateBasketCost(
  [{ productId: 1, quantity: 10, unitLandedCost: 6 }],
  100,
);
assertClose(b1.totalComponentCost, 50, "B before");
assertClose(b2.totalComponentCost, 60, "B after landed change");
assertClose(b2.estimatedProfit, 40, "B profit after");

console.log("--- Example C: missing cost warning ---");
const c = estimateBasketCost(
  [
    { productId: 1, quantity: 1, unitLandedCost: 5 },
    { productId: 2, quantity: 1, unitLandedCost: null, missingCost: true },
  ],
  20,
);
assertClose(c.totalComponentCost, 5, "C total ignores missing as 0");
assertClose(c.missingCostCount, 1, "C missing count");

console.log("--- Example D: no selling price ---");
const d = estimateBasketCost(
  [{ productId: 1, quantity: 3, unitLandedCost: 2 }],
  null,
);
assertClose(d.totalComponentCost, 6, "D components");
assertClose(d.estimatedProfit, null, "D profit null");
assertClose(d.estimatedMarginPct, null, "D margin null");

if (process.exitCode) {
  console.error("\nSome assertions failed.");
  process.exit(1);
}
console.log("\nAll basket-cost examples passed.");
