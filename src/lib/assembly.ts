/**
 * Gift-basket assembly: consumption math + snapshot freeze helpers.
 * Stock mutations live in createAssembly / cancelAssembly (actions).
 */

import { resolveUnitCost } from "@/lib/basket-cost";
import type { AssemblyMode } from "@/db/schema";

export type AssemblyComponentNeed = {
  productId: number;
  productName: string;
  sku: string | null;
  recipeQtyPerUnit: number;
  /** Total units to consume = recipeQty × assemblyQty */
  quantityNeeded: number;
  currentStock: number;
  unitLandedCost: number;
  missingCost: boolean;
  sufficient: boolean;
  shortfall: number;
};

export type AssemblyPreview = {
  basketId: number;
  basketName: string;
  sellingPrice: number | null;
  quantity: number;
  assemblyMode: AssemblyMode;
  components: AssemblyComponentNeed[];
  /** Cost per finished basket unit (frozen later) */
  unitComponentCost: number;
  totalComponentCost: number;
  totalRevenue: number | null;
  canConfirm: boolean;
  errors: string[];
  warnings: string[];
};

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export function consumeIdempotencyKey(
  assemblyId: number,
  productId: number,
): string {
  return `assembly:${assemblyId}:product:${productId}:consume`;
}

export function reverseIdempotencyKey(
  assemblyId: number,
  productId: number,
): string {
  return `assembly:${assemblyId}:product:${productId}:reverse`;
}

export function computeAssemblyNeeds(
  components: Array<{
    productId: number;
    productName: string;
    sku?: string | null;
    recipeQty: number;
    currentStock: number;
    landedCost: number | null | undefined;
    purchaseCost: number | null | undefined;
  }>,
  assemblyQty: number,
): AssemblyComponentNeed[] {
  const qty = Math.max(0, Math.floor(assemblyQty) || 0);
  return components.map((c) => {
    const per = Math.max(0, Math.floor(c.recipeQty) || 0);
    const needed = per * qty;
    const { unit, missing } = resolveUnitCost(c.landedCost, c.purchaseCost);
    const shortfall = Math.max(0, needed - c.currentStock);
    return {
      productId: c.productId,
      productName: c.productName,
      sku: c.sku ?? null,
      recipeQtyPerUnit: per,
      quantityNeeded: needed,
      currentStock: c.currentStock,
      unitLandedCost: unit,
      missingCost: missing,
      sufficient: shortfall === 0,
      shortfall,
    };
  });
}

export function buildAssemblyPreview(input: {
  basketId: number;
  basketName: string;
  sellingPrice: number | null | undefined;
  quantity: number;
  assemblyMode: AssemblyMode;
  components: Array<{
    productId: number;
    productName: string;
    sku?: string | null;
    recipeQty: number;
    currentStock: number;
    landedCost: number | null | undefined;
    purchaseCost: number | null | undefined;
  }>;
}): AssemblyPreview {
  const quantity = Math.max(0, Math.floor(input.quantity) || 0);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (quantity < 1) {
    errors.push("Indique una cantidad de cestas ≥ 1.");
  }
  if (input.components.length === 0) {
    errors.push("La receta no tiene componentes.");
  }

  const components = computeAssemblyNeeds(input.components, quantity);
  for (const c of components) {
    if (!c.sufficient) {
      errors.push(
        `Stock insuficiente de «${c.productName}»: necesita ${c.quantityNeeded}, hay ${c.currentStock} (faltan ${c.shortfall}).`,
      );
    }
    if (c.missingCost) {
      warnings.push(
        `«${c.productName}» no tiene coste de adquisición ni precio de compra; se congelará 0,00 €.`,
      );
    }
  }

  const unitComponentCost = roundMoney(
    components.reduce(
      (s, c) => s + c.recipeQtyPerUnit * c.unitLandedCost,
      0,
    ),
  );
  const totalComponentCost = roundMoney(unitComponentCost * quantity);
  const sell =
    input.sellingPrice != null && Number.isFinite(input.sellingPrice)
      ? input.sellingPrice
      : null;
  const totalRevenue =
    sell != null ? roundMoney(sell * quantity) : null;

  if (sell == null) {
    warnings.push(
      "La receta no tiene precio de venta; el ingreso registrado quedará vacío.",
    );
  }

  return {
    basketId: input.basketId,
    basketName: input.basketName,
    sellingPrice: sell,
    quantity,
    assemblyMode: input.assemblyMode,
    components,
    unitComponentCost,
    totalComponentCost,
    totalRevenue,
    canConfirm: errors.length === 0,
    errors,
    warnings,
  };
}

/** Frozen line snapshots for one assembly (totals = qty × unit). */
export function freezeAssemblyLines(
  needs: AssemblyComponentNeed[],
): Array<{
  productId: number;
  quantity: number;
  recipeQtyPerUnit: number;
  unitLandedCostSnapshot: number;
  lineCostSnapshot: number;
}> {
  return needs.map((c) => ({
    productId: c.productId,
    quantity: c.quantityNeeded,
    recipeQtyPerUnit: c.recipeQtyPerUnit,
    unitLandedCostSnapshot: roundMoney(c.unitLandedCost),
    lineCostSnapshot: roundMoney(c.quantityNeeded * c.unitLandedCost),
  }));
}

export { roundMoney };
