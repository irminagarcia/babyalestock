import type { AllocationMethod } from "@/db/schema";

export type DeliveryLineInput = {
  /** Client-side key or DB id for matching results. */
  key: string;
  productId: number;
  quantity: number;
  unitPurchaseNet: number;
  vatRate: number;
  vatRecoverable: boolean;
};

export type DeliveryCostHeader = {
  shippingCost: number;
  otherCosts: number;
  allocationMethod: AllocationMethod;
};

export type ComputedDeliveryLine = DeliveryLineInput & {
  lineNet: number;
  vatAmount: number;
  allocatedOverhead: number;
  nonRecoverableTax: number;
  landedUnitCost: number;
  recoverableVat: number;
};

export type ComputedDelivery = {
  lines: ComputedDeliveryLine[];
  totals: {
    lineNet: number;
    overhead: number;
    recoverableVat: number;
    nonRecoverableTax: number;
    landedTotal: number;
  };
};

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * Allocate portes/otros and compute landed unit cost per line.
 *
 * landed_unit_cost = (line_net + allocated_overhead + non_recoverable_tax) / qty
 * Recoverable VAT is tracked but excluded from landed cost.
 */
export function computeDeliveryCosts(
  header: DeliveryCostHeader,
  lines: DeliveryLineInput[],
): ComputedDelivery {
  if (lines.length === 0) {
    return {
      lines: [],
      totals: {
        lineNet: 0,
        overhead: roundMoney(header.shippingCost + header.otherCosts),
        recoverableVat: 0,
        nonRecoverableTax: 0,
        landedTotal: 0,
      },
    };
  }

  const prepared = lines.map((line) => {
    const qty = Math.max(0, Math.floor(line.quantity));
    const unit = Number(line.unitPurchaseNet) || 0;
    const rate = Number(line.vatRate) || 0;
    const lineNet = roundMoney(qty * unit);
    const vatAmount = roundMoney(lineNet * (rate / 100));
    return { ...line, quantity: qty, unitPurchaseNet: unit, vatRate: rate, lineNet, vatAmount };
  });

  const sumNet = prepared.reduce((s, l) => s + l.lineNet, 0);
  const sumQty = prepared.reduce((s, l) => s + l.quantity, 0);
  const overhead = roundMoney(
    (Number(header.shippingCost) || 0) + (Number(header.otherCosts) || 0),
  );

  const method = header.allocationMethod === "by_quantity" ? "by_quantity" : "by_net_value";

  // First pass: proportional shares; last line gets remainder to avoid rounding drift.
  const weights = prepared.map((l) => {
    if (method === "by_quantity") {
      return sumQty > 0 ? l.quantity / sumQty : 0;
    }
    return sumNet > 0 ? l.lineNet / sumNet : 0;
  });

  let allocatedSum = 0;
  const computed: ComputedDeliveryLine[] = prepared.map((line, i) => {
    const isLast = i === prepared.length - 1;
    let allocatedOverhead: number;
    if (overhead === 0 || (method === "by_net_value" ? sumNet === 0 : sumQty === 0)) {
      allocatedOverhead = 0;
    } else if (isLast) {
      allocatedOverhead = roundMoney(overhead - allocatedSum);
    } else {
      allocatedOverhead = roundMoney(overhead * weights[i]);
      allocatedSum = roundMoney(allocatedSum + allocatedOverhead);
    }

    const recoverableVat = line.vatRecoverable ? line.vatAmount : 0;
    const nonRecoverableTax = line.vatRecoverable ? 0 : line.vatAmount;
    const landedTotalLine = roundMoney(
      line.lineNet + allocatedOverhead + nonRecoverableTax,
    );
    const landedUnitCost =
      line.quantity > 0 ? roundMoney(landedTotalLine / line.quantity) : 0;

    return {
      key: line.key,
      productId: line.productId,
      quantity: line.quantity,
      unitPurchaseNet: line.unitPurchaseNet,
      vatRate: line.vatRate,
      vatRecoverable: line.vatRecoverable,
      lineNet: line.lineNet,
      vatAmount: line.vatAmount,
      allocatedOverhead,
      nonRecoverableTax,
      landedUnitCost,
      recoverableVat,
    };
  });

  return {
    lines: computed,
    totals: {
      lineNet: roundMoney(computed.reduce((s, l) => s + l.lineNet, 0)),
      overhead,
      recoverableVat: roundMoney(computed.reduce((s, l) => s + l.recoverableVat, 0)),
      nonRecoverableTax: roundMoney(
        computed.reduce((s, l) => s + l.nonRecoverableTax, 0),
      ),
      landedTotal: roundMoney(
        computed.reduce(
          (s, l) => s + l.lineNet + l.allocatedOverhead + l.nonRecoverableTax,
          0,
        ),
      ),
    },
  };
}

/**
 * Weighted-average landed cost after receiving `qty` units at `landedUnitCost`.
 */
export function weightedAverageLandedCost(
  stockBefore: number,
  oldLanded: number | null | undefined,
  qty: number,
  landedUnitCost: number,
): number {
  const before = Math.max(0, stockBefore);
  const incoming = Math.max(0, qty);
  if (incoming === 0) {
    return roundMoney(oldLanded ?? landedUnitCost);
  }
  if (before === 0) {
    return roundMoney(landedUnitCost);
  }
  const prior = oldLanded ?? landedUnitCost;
  return roundMoney((before * prior + incoming * landedUnitCost) / (before + incoming));
}

/** Beneficio estimado operativo (no contabilidad). */
export function estimatedMargin(
  sellingPrice: number | null | undefined,
  landedCost: number | null | undefined,
): number | null {
  if (sellingPrice == null || landedCost == null) return null;
  return roundMoney(sellingPrice - landedCost);
}
