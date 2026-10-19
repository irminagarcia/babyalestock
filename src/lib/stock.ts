import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, getSqlite } from "@/db/client";
import {
  products,
  stockMovements,
  type MovementType,
} from "@/db/schema";
import { movementDelta } from "@/lib/labels";

export type CreateMovementInput = {
  productId: number;
  type: MovementType;
  quantity: number;
  reason?: string | null;
  occurredAt?: string | null;
  userId: number;
  idempotencyKey?: string | null;
};

export type MovementResult =
  | { ok: true; movementId: number; stockAfter: number; duplicate?: boolean }
  | { ok: false; error: string };

export function createStockMovement(input: CreateMovementInput): MovementResult {
  const db = getDb();
  const sqlite = getSqlite();
  const key = input.idempotencyKey?.trim() || randomUUID();

  const existing = db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.idempotencyKey, key))
    .get();

  if (existing) {
    return {
      ok: true,
      movementId: existing.id,
      stockAfter: existing.stockAfter,
      duplicate: true,
    };
  }

  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    return { ok: false, error: "La cantidad debe ser un número distinto de cero." };
  }

  if (input.type !== "manual_correction" && input.quantity < 0) {
    return {
      ok: false,
      error: "Para este tipo de movimiento use una cantidad positiva.",
    };
  }

  try {
    const result = sqlite.transaction(() => {
      const product = db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .get();

      if (!product) {
        throw new Error("Producto no encontrado.");
      }

      if (product.status === "archived") {
        throw new Error(
          "No se pueden registrar movimientos en un producto archivado.",
        );
      }

      const delta = movementDelta(input.type, input.quantity);
      const stockBefore = product.currentStock;
      const stockAfter = stockBefore + delta;

      if (stockAfter < 0) {
        throw new Error(
          `Existencias insuficientes (actual: ${stockBefore}, cambio: ${delta}).`,
        );
      }

      db.update(products)
        .set({
          currentStock: stockAfter,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, product.id))
        .run();

      const movement = db
        .insert(stockMovements)
        .values({
          productId: product.id,
          type: input.type,
          quantity: input.type === "manual_correction" ? input.quantity : Math.abs(input.quantity),
          stockBefore,
          stockAfter,
          reason: input.reason?.trim() || null,
          occurredAt: input.occurredAt || new Date().toISOString(),
          userId: input.userId,
          idempotencyKey: key,
        })
        .returning()
        .get();

      return { movementId: movement.id, stockAfter };
    })();

    return { ok: true, ...result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo registrar el movimiento.";
    // Unique constraint race on idempotency key
    if (message.includes("UNIQUE") || message.includes("unique")) {
      const again = db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.idempotencyKey, key))
        .get();
      if (again) {
        return {
          ok: true,
          movementId: again.id,
          stockAfter: again.stockAfter,
          duplicate: true,
        };
      }
    }
    return { ok: false, error: message };
  }
}
