"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  products,
  stockMovements,
  users,
  type MovementType,
  movementTypeValues,
} from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createStockMovement } from "@/lib/stock";

export type MovementFormState = {
  error?: string;
  success?: string;
};

export async function recordMovementAction(
  _prev: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const productId = Number(formData.get("productId"));
  const type = String(formData.get("type") || "") as MovementType;
  const quantity = Number(String(formData.get("quantity") || "").replace(",", "."));
  const reason = String(formData.get("reason") || "").trim();
  const occurredAt = String(formData.get("occurredAt") || "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") || "").trim();

  if (!movementTypeValues.includes(type)) {
    return { error: "Tipo de movimiento no válido." };
  }
  if (!Number.isFinite(productId)) {
    return { error: "Seleccione un producto." };
  }

  const result = createStockMovement({
    productId,
    type,
    quantity,
    reason: reason || null,
    occurredAt: occurredAt ? new Date(occurredAt).toISOString() : null,
    userId: user.id,
    idempotencyKey: idempotencyKey || null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/movimientos");
  revalidatePath("/productos");
  revalidatePath("/panel");

  if (result.duplicate) {
    return {
      success: "Movimiento ya registrado (clave de idempotencia).",
    };
  }

  return {
    success: `Movimiento guardado. Existencias actuales: ${result.stockAfter}.`,
  };
}

/** @deprecated use recordMovementAction — kept for programmatic callers */
export async function recordMovement(formData: FormData) {
  const user = await requireUser();
  const productId = Number(formData.get("productId"));
  const type = String(formData.get("type") || "") as MovementType;
  const quantity = Number(String(formData.get("quantity") || "").replace(",", "."));
  const reason = String(formData.get("reason") || "").trim();
  const occurredAt = String(formData.get("occurredAt") || "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") || "").trim();

  if (!movementTypeValues.includes(type)) {
    return { ok: false as const, error: "Tipo de movimiento no válido." };
  }
  if (!Number.isFinite(productId)) {
    return { ok: false as const, error: "Seleccione un producto." };
  }

  const result = createStockMovement({
    productId,
    type,
    quantity,
    reason: reason || null,
    occurredAt: occurredAt ? new Date(occurredAt).toISOString() : null,
    userId: user.id,
    idempotencyKey: idempotencyKey || null,
  });

  if (result.ok) {
    revalidatePath("/movimientos");
    revalidatePath("/productos");
    revalidatePath("/panel");
  }
  return result;
}

export async function listMovements(limit = 100) {
  await requireUser();
  const db = getDb();
  return db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      stockBefore: stockMovements.stockBefore,
      stockAfter: stockMovements.stockAfter,
      reason: stockMovements.reason,
      occurredAt: stockMovements.occurredAt,
      productName: products.name,
      productSku: products.sku,
      userName: users.displayName,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .orderBy(desc(stockMovements.occurredAt), desc(stockMovements.id))
    .limit(limit)
    .all();
}
