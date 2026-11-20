"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createStockMovement } from "@/lib/stock";

export type StockCorrectionResult =
  | { ok: true; productId: number; stockAfter: number; unchanged?: boolean }
  | { ok: false; error: string };

function parseNonNegativeInt(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Set absolute stock from the product edit page.
 * Records a `manual_correction` movement for the delta (audit trail).
 */
export async function correctProductStock(
  formData: FormData,
): Promise<StockCorrectionResult> {
  const user = await requireUser();
  const productId = Number(formData.get("productId"));
  const newStock = parseNonNegativeInt(formData.get("newStock"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isFinite(productId)) {
    return { ok: false, error: "Producto no válido." };
  }
  if (newStock === null) {
    return {
      ok: false,
      error: "La nueva cantidad debe ser un número entero mayor o igual que 0.",
    };
  }
  if (!reason) {
    return {
      ok: false,
      error: "Indique el motivo de la corrección (queda en el historial).",
    };
  }

  const product = await one(
    getDb().select().from(products).where(eq(products.id, productId)),
  );
  if (!product) {
    return { ok: false, error: "Producto no encontrado." };
  }
  if (product.status === "archived") {
    return {
      ok: false,
      error: "No se puede corregir el stock de un producto archivado.",
    };
  }

  const delta = newStock - product.currentStock;
  if (delta === 0) {
    return {
      ok: true,
      productId,
      stockAfter: product.currentStock,
      unchanged: true,
    };
  }

  const result = await createStockMovement({
    productId,
    type: "manual_correction",
    quantity: delta,
    reason,
    userId: user.id,
    sourceType: "product_edit",
    sourceId: productId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/productos");
  revalidatePath(`/productos/${productId}`);
  revalidatePath(`/productos/${productId}/editar`);
  revalidatePath("/movimientos");
  revalidatePath("/panel");

  return {
    ok: true,
    productId,
    stockAfter: result.stockAfter,
  };
}
