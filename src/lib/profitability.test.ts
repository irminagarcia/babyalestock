/**
 * Phase 3 profitability helpers.
 * Run: npx tsx src/lib/profitability.test.ts
 */
import {
  moneyTotals,
  parsePeriodBounds,
  sumBasketPortfolio,
  sumRecordedSales,
  type BasketProfitRow,
  type RecordedBasketSaleRow,
} from "./profitability";

function assertClose(a: number | null, b: number | null, label: string) {
  if (a == null || b == null) {
    if (a === b) {
      console.log(`OK   ${label}`);
      return;
    }
    console.error(`FAIL ${label}: ${a} vs ${b}`);
    process.exitCode = 1;
    return;
  }
  if (Math.abs(a - b) > 0.0002) {
    console.error(`FAIL ${label}: ${a} vs ${b}`);
    process.exitCode = 1;
  } else console.log(`OK   ${label}: ${a}`);
}

console.log("--- moneyTotals ---");
const t = moneyTotals(40, 100);
assertClose(t.profit, 60, "profit");
assertClose(t.marginPct, 60, "margin");

console.log("--- portfolio estimado ---");
const rows: BasketProfitRow[] = [
  {
    basketId: 1,
    name: "A",
    sku: null,
    status: "active",
    componentCount: 2,
    estimatedCost: 13,
    sellingPrice: 29.9,
    estimatedProfit: 16.9,
    estimatedMarginPct: 56.5,
    missingCostCount: 0,
    nature: "estimado",
  },
  {
    basketId: 2,
    name: "B",
    sku: null,
    status: "active",
    componentCount: 1,
    estimatedCost: 10,
    sellingPrice: 20,
    estimatedProfit: 10,
    estimatedMarginPct: 50,
    missingCostCount: 0,
    nature: "estimado",
  },
];
const p = sumBasketPortfolio(rows);
assertClose(p.cost, 23, "portfolio cost");
assertClose(p.revenue, 49.9, "portfolio revenue");
assertClose(p.profit, 26.9, "portfolio profit");
assertClose(p.basketCount, 2, "count");

console.log("--- registrado period ---");
const sales: RecordedBasketSaleRow[] = [
  {
    assemblyId: 1,
    basketId: 1,
    basketName: "A",
    quantity: 2,
    assembledAt: "2026-10-01",
    costSnapshot: 26,
    revenueSnapshot: 59.8,
    profit: 33.8,
    nature: "registrado",
  },
];
const r = sumRecordedSales(sales);
assertClose(r.units, 2, "units");
assertClose(r.cost, 26, "reg cost");
assertClose(r.revenue, 59.8, "reg revenue");

console.log("--- period bounds ---");
const b = parsePeriodBounds("2026-10-01", "2026-10-31");
if (!b.fromIso || !b.toIso) {
  console.error("FAIL bounds");
  process.exitCode = 1;
} else console.log("OK   bounds", b.fromIso.slice(0, 10), b.toIso.slice(0, 10));

if (process.exitCode) process.exit(1);
console.log("\nAll profitability tests passed.");
