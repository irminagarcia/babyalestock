/**
 * Live gift-basket recipe costing from component landed costs.
 * Does not touch stock. Does not persist historical snapshots (assembly later).
 */

export type BasketComponentCostInput = {
  key?: string;
  productId: number;
  productName?: string;
  quantity: number;
  /** Coste de adquisición; fallback to purchase cost handled by caller. */
  unitLandedCost: number | null;
  missingCost?: boolean;
};

export type BasketComponentCostLine = BasketComponentCostInput & {
  unitLandedCost: number;
  lineCost: number;
};

export type BasketCostEstimate = {
  lines: BasketComponentCostLine[];
  totalComponentCost: number;
  sellingPrice: number | null;
  estimatedProfit: number | null;
  /** Margin % of selling price; null if no selling price. */
  estimatedMarginPct: number | null;
  missingCostCount: number;
};

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export function resolveUnitCost(
  landedCost: number | null | undefined,
  purchaseCost: number | null | undefined,
): { unit: number; missing: boolean } {
  if (landedCost != null && Number.isFinite(landedCost)) {
    return { unit: landedCost, missing: false };
  }
  if (purchaseCost != null && Number.isFinite(purchaseCost)) {
    return { unit: purchaseCost, missing: false };
  }
  return { unit: 0, missing: true };
}

/**
 * total_components = Σ qty × unit_cost
 * beneficio = selling − total_components
 * margen_% = beneficio / selling × 100
 */
export function estimateBasketCost(
  components: BasketComponentCostInput[],
  sellingPrice: number | null | undefined,
): BasketCostEstimate {
  const lines: BasketComponentCostLine[] = components.map((c) => {
    const qty = Math.max(0, Number(c.quantity) || 0);
    const unit = c.unitLandedCost != null && Number.isFinite(c.unitLandedCost)
      ? c.unitLandedCost
      : 0;
    const missing = Boolean(c.missingCost) || c.unitLandedCost == null;
    return {
      ...c,
      quantity: qty,
      unitLandedCost: unit,
      lineCost: roundMoney(qty * unit),
      missingCost: missing,
    };
  });

  const totalComponentCost = roundMoney(
    lines.reduce((s, l) => s + l.lineCost, 0),
  );
  const sell =
    sellingPrice != null && Number.isFinite(sellingPrice) ? sellingPrice : null;
  const estimatedProfit =
    sell != null ? roundMoney(sell - totalComponentCost) : null;
  const estimatedMarginPct =
    sell != null && sell > 0 && estimatedProfit != null
      ? roundMoney((estimatedProfit / sell) * 100)
      : null;

  return {
    lines,
    totalComponentCost,
    sellingPrice: sell,
    estimatedProfit,
    estimatedMarginPct,
    missingCostCount: lines.filter((l) => l.missingCost).length,
  };
}
