"use server";

import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import {
  giftBasketAssemblies,
  giftBasketComponents,
  giftBaskets,
  products,
  stockMovements,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { estimateBasketCost, resolveUnitCost } from "@/lib/basket-cost";
import {
  parsePeriodBounds,
  sumBasketPortfolio,
  sumRecordedSales,
  type BasketProfitRow,
  type ProductProfitRow,
  type RecordedBasketSaleRow,
} from "@/lib/profitability";

export async function getProfitabilityOverview(opts: {
  from?: string | null;
  to?: string | null;
  basketStatus?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const statusFilter = opts.basketStatus || "active";

  const baskets = (await db.select().from(giftBaskets))
    .filter((b) =>
      statusFilter === "all" ? true : b.status === statusFilter,
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const basketRows: BasketProfitRow[] = await Promise.all(
    baskets.map(async (b) => {
      const comps = await db
        .select({
          quantity: giftBasketComponents.quantity,
          landedCost: products.landedCost,
          purchaseCost: products.purchaseCost,
        })
        .from(giftBasketComponents)
        .innerJoin(products, eq(giftBasketComponents.productId, products.id))
        .where(eq(giftBasketComponents.basketId, b.id));

      const estimate = estimateBasketCost(
        comps.map((c, i) => {
          const { unit, missing } = resolveUnitCost(c.landedCost, c.purchaseCost);
          return {
            key: String(i),
            productId: 0,
            quantity: c.quantity,
            unitLandedCost: missing ? null : unit,
            missingCost: missing,
          };
        }),
        b.sellingPrice,
      );

      return {
        basketId: b.id,
        name: b.name,
        sku: b.sku,
        status: b.status,
        componentCount: comps.length,
        estimatedCost: estimate.totalComponentCost,
        sellingPrice: b.sellingPrice,
        estimatedProfit: estimate.estimatedProfit,
        estimatedMarginPct: estimate.estimatedMarginPct,
        missingCostCount: estimate.missingCostCount,
        nature: "estimado" as const,
      };
    }),
  );

  const portfolio = sumBasketPortfolio(basketRows);

  const productList = (
    await db.select().from(products).where(ne(products.status, "archived"))
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));

  const productRows: ProductProfitRow[] = productList.map((p) => {
    const unitCost = resolveUnitCost(p.landedCost, p.purchaseCost);
    const sell = p.sellingPrice;
    const unitEstimatedProfit =
      sell != null && !unitCost.missing
        ? Math.round((sell - unitCost.unit + Number.EPSILON) * 10000) / 10000
        : sell != null
          ? Math.round((sell - unitCost.unit + Number.EPSILON) * 10000) / 10000
          : null;
    const unitEstimatedMarginPct =
      sell != null && sell > 0 && unitEstimatedProfit != null
        ? Math.round(((unitEstimatedProfit / sell) * 100 + Number.EPSILON) * 10000) /
          10000
        : null;

    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      status: p.status,
      usage: p.usage,
      currentStock: p.currentStock,
      purchaseCost: p.purchaseCost,
      landedCost: p.landedCost,
      sellingPrice: p.sellingPrice,
      unitEstimatedProfit,
      unitEstimatedMarginPct,
      nature: "estimado" as const,
    };
  });

  const { fromIso, toIso } = parsePeriodBounds(opts.from, opts.to);
  const assemblyConditions = [
    eq(giftBasketAssemblies.status, "recorded"),
  ];
  if (fromIso) assemblyConditions.push(gte(giftBasketAssemblies.assembledAt, fromIso));
  if (toIso) assemblyConditions.push(lte(giftBasketAssemblies.assembledAt, toIso));

  const assemblies = await db
    .select({
      id: giftBasketAssemblies.id,
      basketId: giftBasketAssemblies.basketId,
      quantity: giftBasketAssemblies.quantity,
      assembledAt: giftBasketAssemblies.assembledAt,
      totalComponentCostSnapshot: giftBasketAssemblies.totalComponentCostSnapshot,
      sellingPriceSnapshot: giftBasketAssemblies.sellingPriceSnapshot,
      recipeNameSnapshot: giftBasketAssemblies.recipeNameSnapshot,
      basketName: giftBaskets.name,
    })
    .from(giftBasketAssemblies)
    .innerJoin(giftBaskets, eq(giftBasketAssemblies.basketId, giftBaskets.id))
    .where(and(...assemblyConditions))
    .orderBy(desc(giftBasketAssemblies.assembledAt));

  const recordedRows: RecordedBasketSaleRow[] = assemblies.map((a) => {
    const cost = (a.totalComponentCostSnapshot ?? 0) * a.quantity;
    const revenue = (a.sellingPriceSnapshot ?? 0) * a.quantity;
    return {
      assemblyId: a.id,
      basketId: a.basketId,
      basketName: a.recipeNameSnapshot || a.basketName,
      quantity: a.quantity,
      assembledAt: a.assembledAt,
      costSnapshot: Math.round((cost + Number.EPSILON) * 10000) / 10000,
      revenueSnapshot: Math.round((revenue + Number.EPSILON) * 10000) / 10000,
      profit: Math.round((revenue - cost + Number.EPSILON) * 10000) / 10000,
      nature: "registrado" as const,
    };
  });

  const recordedTotals = sumRecordedSales(recordedRows);

  // Product-level sales in period (registrado at product grain — not basket)
  const saleConditions = [eq(stockMovements.type, "sale")];
  if (fromIso) saleConditions.push(gte(stockMovements.occurredAt, fromIso));
  if (toIso) saleConditions.push(lte(stockMovements.occurredAt, toIso));

  const productSales = await one(
    db
      .select({
        count: sql<number>`count(*)`,
        units: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)`,
      })
      .from(stockMovements)
      .where(and(...saleConditions)),
  );

  return {
    basketRows,
    portfolio,
    productRows,
    recordedRows,
    recordedTotals,
    productSalesInPeriod: {
      movementCount: Number(productSales?.count ?? 0),
      units: Number(productSales?.units ?? 0),
    },
    period: { from: opts.from || null, to: opts.to || null },
    basketStatus: statusFilter,
    hasRecordedBasketSales: recordedRows.length > 0,
  };
}
