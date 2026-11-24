"use server";

import { count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one, withTransaction } from "@/db/query";
import {
  giftBasketAssemblyLines,
  giftBasketComponents,
  orderLines,
  products,
  stockMovements,
  supplierDeliveryLines,
  woocommerceLinks,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getPhotosDir } from "@/lib/paths";
import { safeRevalidate } from "@/lib/safe-revalidate";
import fs from "node:fs";
import path from "node:path";

export type ProductDeleteAssessment = {
  productId: number;
  name: string;
  currentStock: number;
  movementCount: number;
  basketComponentCount: number;
  deliveryLineCount: number;
  assemblyLineCount: number;
  orderLineCount: number;
  wooLinkCount: number;
  /** Hard blockers — deletion refused until resolved. */
  blockers: string[];
  /** Soft warnings shown in the confirm UI (related rows that will be removed). */
  warnings: string[];
  canDelete: boolean;
};

async function countWhere(
  table:
    | typeof stockMovements
    | typeof giftBasketComponents
    | typeof supplierDeliveryLines
    | typeof giftBasketAssemblyLines
    | typeof orderLines
    | typeof woocommerceLinks,
  productId: number,
): Promise<number> {
  const db = getDb();
  const row = await one(
    db
      .select({ n: count() })
      .from(table)
      .where(eq(table.productId, productId)),
  );
  return Number(row?.n ?? 0);
}

export type AssessProductDeleteResult =
  | ({ ok: true } & ProductDeleteAssessment)
  | { ok: false; error: string };

export async function assessProductDelete(
  productId: number,
): Promise<AssessProductDeleteResult> {
  await requireUser();
  if (!Number.isFinite(productId) || productId <= 0) {
    return { ok: false, error: "Producto no válido." };
  }

  const product = await one(
    getDb().select().from(products).where(eq(products.id, productId)),
  );
  if (!product) {
    return { ok: false, error: "Producto no encontrado." };
  }

  const [
    movementCount,
    basketComponentCount,
    deliveryLineCount,
    assemblyLineCount,
    orderLineCount,
    wooLinkCount,
  ] = await Promise.all([
    countWhere(stockMovements, productId),
    countWhere(giftBasketComponents, productId),
    countWhere(supplierDeliveryLines, productId),
    countWhere(giftBasketAssemblyLines, productId),
    countWhere(orderLines, productId),
    countWhere(woocommerceLinks, productId),
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];

  const stockNow = Number(product.currentStock);
  if (!Number.isFinite(stockNow) || stockNow !== 0) {
    blockers.push(
      `Hay ${Number.isFinite(stockNow) ? stockNow : product.currentStock} unidad(es) en stock. Ponga las existencias a 0 (corrección o salida) antes de eliminar.`,
    );
  }
  if (deliveryLineCount > 0) {
    blockers.push(
      `Aparece en ${deliveryLineCount} línea(s) de entrega de proveedor. No se puede borrar para conservar el historial de costes.`,
    );
  }
  if (assemblyLineCount > 0) {
    blockers.push(
      `Forma parte de ${assemblyLineCount} montaje(s) de cesta registrados. No se puede borrar ese historial.`,
    );
  }

  if (movementCount > 0) {
    warnings.push(
      `Se eliminarán ${movementCount} movimiento(s) de stock asociados.`,
    );
  }
  if (basketComponentCount > 0) {
    warnings.push(
      `Se quitará de ${basketComponentCount} receta(s) de cesta.`,
    );
  }
  if (orderLineCount > 0) {
    warnings.push(
      `Se desvinculará de ${orderLineCount} línea(s) de pedido.`,
    );
  }
  if (wooLinkCount > 0) {
    warnings.push(
      `Se eliminarán ${wooLinkCount} enlace(s) de WooCommerce.`,
    );
  }

  return {
    ok: true,
    productId,
    name: product.name,
    currentStock: Number(product.currentStock) || 0,
    movementCount,
    basketComponentCount,
    deliveryLineCount,
    assemblyLineCount,
    orderLineCount,
    wooLinkCount,
    blockers,
    warnings,
    canDelete: blockers.length === 0,
  };
}

export type DeleteProductResult =
  | { ok: true; name: string }
  | { ok: false; error: string; blockers?: string[] };

/**
 * Permanently delete a product after safety checks.
 * Related movements / recipe lines / soft links are removed when allowed.
 */
export async function deleteProduct(
  productId: number,
): Promise<DeleteProductResult> {
  await requireUser();
  const assessment = await assessProductDelete(productId);
  if (!assessment.ok) {
    return { ok: false, error: assessment.error };
  }
  if (!assessment.canDelete) {
    return {
      ok: false,
      error: assessment.blockers[0] || "No se puede eliminar este producto.",
      blockers: assessment.blockers,
    };
  }

  const product = await one(
    getDb().select().from(products).where(eq(products.id, productId)),
  );
  if (!product) {
    return { ok: false, error: "Producto no encontrado." };
  }

  // Re-check stock inside the transaction window
  if (Number(product.currentStock) !== 0) {
    return {
      ok: false,
      error:
        "Hay existencias distintas de 0. Ponga el stock a 0 antes de eliminar.",
    };
  }

  await withTransaction(async (tx) => {
    // Clear FKs that point at this product's movements (draft safety; confirmed
    // deliveries are already blocked above).
    const moveIds = (
      await tx
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.productId, productId))
    ).map((r) => r.id);

    if (moveIds.length > 0) {
      await tx
        .update(supplierDeliveryLines)
        .set({ stockMovementId: null })
        .where(inArray(supplierDeliveryLines.stockMovementId, moveIds));
      await tx
        .update(giftBasketAssemblyLines)
        .set({ stockMovementId: null })
        .where(inArray(giftBasketAssemblyLines.stockMovementId, moveIds));
      await tx
        .delete(stockMovements)
        .where(eq(stockMovements.productId, productId));
    }

    await tx
      .delete(giftBasketComponents)
      .where(eq(giftBasketComponents.productId, productId));

    await tx
      .delete(woocommerceLinks)
      .where(eq(woocommerceLinks.productId, productId));

    await tx
      .update(orderLines)
      .set({ productId: null })
      .where(eq(orderLines.productId, productId));

    await tx.delete(products).where(eq(products.id, productId));
  });

  if (product.photoPath) {
    try {
      const photoFile = path.join(getPhotosDir(), product.photoPath);
      if (fs.existsSync(photoFile)) fs.unlinkSync(photoFile);
    } catch {
      // Non-fatal: product row is already gone.
    }
  }

  safeRevalidate("/productos", "/panel", "/movimientos", "/cestas");
  return { ok: true, name: product.name };
}
