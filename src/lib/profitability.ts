/**
 * Operational profitability helpers (Estimado vs Registrado).
 * Not a full P&L / tax product.
 */

export type MoneyTotals = {
  cost: number;
  revenue: number;
  profit: number;
  marginPct: number | null;
};

export type BasketProfitRow = {
  basketId: number;
  name: string;
  sku: string | null;
  status: string;
  componentCount: number;
  estimatedCost: number;
  sellingPrice: number | null;
  estimatedProfit: number | null;
  estimatedMarginPct: number | null;
  missingCostCount: number;
  /** Estimado | N/D */
  nature: "estimado";
};

export type ProductProfitRow = {
  productId: number;
  name: string;
  sku: string | null;
  status: string;
  usage: string;
  currentStock: number;
  purchaseCost: number | null;
  landedCost: number | null;
  sellingPrice: number | null;
  unitEstimatedProfit: number | null;
  unitEstimatedMarginPct: number | null;
  nature: "estimado";
};

export type RecordedBasketSaleRow = {
  assemblyId: number;
  basketId: number;
  basketName: string;
  quantity: number;
  assembledAt: string;
  costSnapshot: number;
  revenueSnapshot: number;
  profit: number;
  nature: "registrado";
};

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export function moneyTotals(cost: number, revenue: number): MoneyTotals {
  const profit = roundMoney(revenue - cost);
  const marginPct =
    revenue > 0 ? roundMoney((profit / revenue) * 100) : null;
  return { cost: roundMoney(cost), revenue: roundMoney(revenue), profit, marginPct };
}

export function sumBasketPortfolio(rows: BasketProfitRow[]): MoneyTotals & {
  basketCount: number;
  withSellingPrice: number;
} {
  let cost = 0;
  let revenue = 0;
  let withSellingPrice = 0;
  for (const r of rows) {
    cost += r.estimatedCost;
    if (r.sellingPrice != null) {
      revenue += r.sellingPrice;
      withSellingPrice++;
    }
  }
  return {
    ...moneyTotals(cost, revenue),
    basketCount: rows.length,
    withSellingPrice,
  };
}

export function sumRecordedSales(rows: RecordedBasketSaleRow[]): MoneyTotals & {
  units: number;
  saleCount: number;
} {
  let cost = 0;
  let revenue = 0;
  let units = 0;
  for (const r of rows) {
    cost += r.costSnapshot;
    revenue += r.revenueSnapshot;
    units += r.quantity;
  }
  return {
    ...moneyTotals(cost, revenue),
    units,
    saleCount: rows.length,
  };
}

export function parsePeriodBounds(from?: string | null, to?: string | null): {
  fromIso: string | null;
  toIso: string | null;
} {
  const fromIso = from?.trim()
    ? new Date(`${from.trim()}T00:00:00.000`).toISOString()
    : null;
  const toIso = to?.trim()
    ? new Date(`${to.trim()}T23:59:59.999`).toISOString()
    : null;
  return { fromIso, toIso };
}

export { roundMoney };
