import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, type Db, type Tx } from "@/db/client";
import { one } from "@/db/query";
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
  sourceType?: string | null;
  sourceId?: number | null;
  /**
   * When true, skip the outer transaction (caller already inside one).
   * Pass `tx` from the outer transaction callback.
   */
  skipTransaction?: boolean;
  tx?: Tx;
};

export type MovementResult =
  | { ok: true; movementId: number; stockAfter: number; duplicate?: boolean }
  | { ok: false; error: string };

export async function createStockMovement(
  input: CreateMovementInput,
): Promise<MovementResult> {
  const db = getDb();
  const key = input.idempotencyKey?.trim() || randomUUID();

  const existing = await one(
    db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.idempotencyKey, key)),
  );

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

  const run = async (tx: Tx | Db) => {
    const product = await one(
      tx.select().from(products).where(eq(products.id, input.productId)),
    );

    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    if (product.status === "archived") {
      throw new Error(
        "No se pueden registrar movimientos en un producto archivado.",
      );
    }

    const delta = movementDelta(input.type, input.quantity);
    const stockBefore = Number(product.currentStock);
    if (!Number.isFinite(stockBefore)) {
      throw new Error(
        "No se pudo leer las existencias actuales. Recargue e inténtelo de nuevo.",
      );
    }
    const stockAfter = stockBefore + delta;

    if (stockAfter < 0) {
      throw new Error(
        `Existencias insuficientes (actual: ${stockBefore}, cambio: ${delta}).`,
      );
    }

    await tx
      .update(products)
      .set({
        currentStock: stockAfter,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, product.id));

    const movement = await one(
      tx
        .insert(stockMovements)
        .values({
          productId: product.id,
          type: input.type,
          quantity:
            input.type === "manual_correction"
              ? input.quantity
              : Math.abs(input.quantity),
          stockBefore,
          stockAfter,
          reason: input.reason?.trim() || null,
          occurredAt: input.occurredAt || new Date().toISOString(),
          userId: input.userId,
          idempotencyKey: key,
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
        })
        .returning(),
    );

    if (!movement) {
      throw new Error("No se pudo crear el movimiento de stock.");
    }

    return { movementId: movement.id, stockAfter, stockBefore };
  };

  try {
    let result: { movementId: number; stockAfter: number; stockBefore: number };
    if (input.skipTransaction) {
      result = await run(input.tx ?? db);
    } else {
      try {
        result = await db.transaction(async (tx) => run(tx));
      } catch (txErr) {
        const txMsg = txErr instanceof Error ? txErr.message : String(txErr);
        // Last resort on misconfigured HTTP Pool: still apply the correction so
        // Irmina can zero stock and delete products. Prefer WebSocket Pool.
        if (/no transactions support|neon-http|poolQueryViaFetch/i.test(txMsg)) {
          result = await run(db);
        } else {
          throw txErr;
        }
      }
    }

    return {
      ok: true,
      movementId: result.movementId,
      stockAfter: result.stockAfter,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo registrar el movimiento.";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      const again = await one(
        db
          .select()
          .from(stockMovements)
          .where(eq(stockMovements.idempotencyKey, key)),
      );
      if (again) {
        return {
          ok: true,
          movementId: again.id,
          stockAfter: again.stockAfter,
          duplicate: true,
        };
      }
    }
    if (/no transactions support|neon-http|poolQueryViaFetch/i.test(message)) {
      return {
        ok: false,
        error:
          "No se pudo completar la corrección de stock. Recargue la página e inténtelo de nuevo.",
      };
    }
    return { ok: false, error: message };
  }
}
