/**
 * Transactional assembly confirm / cancel (DB). Used by server actions and tests.
 */

import { eq } from "drizzle-orm";
import { getDb, getSqlite } from "@/db/client";
import {
  giftBasketAssemblies,
  giftBasketAssemblyLines,
  giftBasketComponents,
  giftBaskets,
  products,
  type AssemblyMode,
} from "@/db/schema";
import {
  buildAssemblyPreview,
  consumeIdempotencyKey,
  freezeAssemblyLines,
  reverseIdempotencyKey,
  type AssemblyPreview,
} from "@/lib/assembly";
import { createStockMovement } from "@/lib/stock";

export type AssembleResult =
  | {
      ok: true;
      assemblyId: number;
      duplicate?: boolean;
      preview: AssemblyPreview;
      success: string;
    }
  | { ok: false; error: string; preview?: AssemblyPreview };

function loadComponents(basketId: number) {
  const db = getDb();
  return db
    .select({
      productId: giftBasketComponents.productId,
      recipeQty: giftBasketComponents.quantity,
      productName: products.name,
      sku: products.sku,
      currentStock: products.currentStock,
      landedCost: products.landedCost,
      purchaseCost: products.purchaseCost,
      status: products.status,
    })
    .from(giftBasketComponents)
    .innerJoin(products, eq(giftBasketComponents.productId, products.id))
    .where(eq(giftBasketComponents.basketId, basketId))
    .all();
}

export function executeConfirmAssembly(input: {
  basketId: number;
  quantity: number;
  assemblyMode: AssemblyMode;
  userId: number;
  notes?: string | null;
  idempotencyKey: string;
  assembledAt?: string;
}): AssembleResult {
  const db = getDb();
  const sqlite = getSqlite();
  const key = input.idempotencyKey.trim();
  if (!key) {
    return { ok: false, error: "Falta la clave de idempotencia." };
  }

  const existing = db
    .select()
    .from(giftBasketAssemblies)
    .where(eq(giftBasketAssemblies.idempotencyKey, key))
    .get();
  if (existing) {
    const preview = buildAssemblyPreview({
      basketId: existing.basketId,
      basketName: existing.recipeNameSnapshot || "",
      sellingPrice: existing.sellingPriceSnapshot,
      quantity: existing.quantity,
      assemblyMode: (existing.assemblyMode as AssemblyMode) || "preassembled",
      components: [],
    });
    return {
      ok: true,
      assemblyId: existing.id,
      duplicate: true,
      preview,
      success: "Este montaje ya estaba registrado (idempotencia).",
    };
  }

  const basket = db
    .select()
    .from(giftBaskets)
    .where(eq(giftBaskets.id, input.basketId))
    .get();
  if (!basket) return { ok: false, error: "Receta no encontrada." };
  if (basket.status !== "active") {
    return { ok: false, error: "Solo se pueden montar recetas activas." };
  }

  const comps = loadComponents(basket.id);
  if (comps.length === 0) {
    return { ok: false, error: "La receta no tiene componentes." };
  }
  if (comps.some((c) => c.status === "archived")) {
    return {
      ok: false,
      error:
        "La receta incluye un producto archivado. Actualice la receta antes de montar.",
    };
  }

  const preview = buildAssemblyPreview({
    basketId: basket.id,
    basketName: basket.name,
    sellingPrice: basket.sellingPrice,
    quantity: input.quantity,
    assemblyMode: input.assemblyMode,
    components: comps,
  });

  if (!preview.canConfirm) {
    return { ok: false, error: preview.errors.join(" "), preview };
  }

  const frozenLines = freezeAssemblyLines(preview.components);
  const now = input.assembledAt || new Date().toISOString();

  try {
    const assemblyId = sqlite.transaction(() => {
      const created = db
        .insert(giftBasketAssemblies)
        .values({
          basketId: basket.id,
          quantity: input.quantity,
          totalComponentCostSnapshot: preview.unitComponentCost,
          sellingPriceSnapshot: preview.sellingPrice,
          recipeNameSnapshot: basket.name,
          assemblyMode: input.assemblyMode,
          assembledAt: now,
          assembledByUserId: input.userId,
          notes: input.notes ?? null,
          status: "recorded",
          idempotencyKey: key,
        })
        .returning()
        .get();

      for (const line of frozenLines) {
        const movement = createStockMovement({
          productId: line.productId,
          type: "removed",
          quantity: line.quantity,
          reason: `Montaje cesta #${created.id} «${basket.name}» × ${input.quantity}`,
          occurredAt: now,
          userId: input.userId,
          idempotencyKey: consumeIdempotencyKey(created.id, line.productId),
          sourceType: "assembly",
          sourceId: created.id,
          skipTransaction: true,
        });
        if (!movement.ok) throw new Error(movement.error);

        db.insert(giftBasketAssemblyLines)
          .values({
            assemblyId: created.id,
            productId: line.productId,
            quantity: line.quantity,
            recipeQtyPerUnit: line.recipeQtyPerUnit,
            unitLandedCostSnapshot: line.unitLandedCostSnapshot,
            lineCostSnapshot: line.lineCostSnapshot,
            stockMovementId: movement.movementId,
          })
          .run();
      }

      if (input.assemblyMode === "preassembled") {
        db.update(giftBaskets)
          .set({
            finishedStock: basket.finishedStock + input.quantity,
            updatedAt: now,
          })
          .where(eq(giftBaskets.id, basket.id))
          .run();
      }

      return created.id;
    })();

    return {
      ok: true,
      assemblyId,
      preview,
      success:
        input.assemblyMode === "preassembled"
          ? `Montaje registrado: ${input.quantity} cesta(s) preensamblada(s). Stock de componentes descontado.`
          : `Montaje bajo pedido registrado: ${input.quantity} cesta(s). Stock de componentes descontado.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo confirmar el montaje.";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      const again = db
        .select()
        .from(giftBasketAssemblies)
        .where(eq(giftBasketAssemblies.idempotencyKey, key))
        .get();
      if (again) {
        return {
          ok: true,
          assemblyId: again.id,
          duplicate: true,
          preview,
          success: "Este montaje ya estaba registrado (idempotencia).",
        };
      }
    }
    return { ok: false, error: message, preview };
  }
}

export function executeCancelAssembly(input: {
  assemblyId: number;
  userId: number;
}): AssembleResult {
  const db = getDb();
  const sqlite = getSqlite();

  const assembly = db
    .select()
    .from(giftBasketAssemblies)
    .where(eq(giftBasketAssemblies.id, input.assemblyId))
    .get();

  if (!assembly) return { ok: false, error: "Montaje no encontrado." };
  if (assembly.status === "cancelled") {
    return {
      ok: true,
      assemblyId: assembly.id,
      preview: buildAssemblyPreview({
        basketId: assembly.basketId,
        basketName: assembly.recipeNameSnapshot || "",
        sellingPrice: assembly.sellingPriceSnapshot,
        quantity: assembly.quantity,
        assemblyMode: (assembly.assemblyMode as AssemblyMode) || "preassembled",
        components: [],
      }),
      success: "El montaje ya estaba anulado.",
      duplicate: true,
    };
  }
  if (assembly.status !== "recorded") {
    return { ok: false, error: "Solo se pueden anular montajes registrados." };
  }

  const lines = db
    .select()
    .from(giftBasketAssemblyLines)
    .where(eq(giftBasketAssemblyLines.assemblyId, input.assemblyId))
    .all();

  const basket = db
    .select()
    .from(giftBaskets)
    .where(eq(giftBaskets.id, assembly.basketId))
    .get();

  const now = new Date().toISOString();
  const name =
    assembly.recipeNameSnapshot ||
    basket?.name ||
    `cesta #${assembly.basketId}`;

  try {
    sqlite.transaction(() => {
      for (const line of lines) {
        const movement = createStockMovement({
          productId: line.productId,
          type: "received",
          quantity: line.quantity,
          reason: `Anulación montaje #${input.assemblyId} «${name}»`,
          occurredAt: now,
          userId: input.userId,
          idempotencyKey: reverseIdempotencyKey(
            input.assemblyId,
            line.productId,
          ),
          sourceType: "assembly_cancel",
          sourceId: input.assemblyId,
          skipTransaction: true,
        });
        if (!movement.ok) throw new Error(movement.error);
      }

      if (assembly.assemblyMode === "preassembled" && basket) {
        const next = Math.max(0, basket.finishedStock - assembly.quantity);
        db.update(giftBaskets)
          .set({ finishedStock: next, updatedAt: now })
          .where(eq(giftBaskets.id, basket.id))
          .run();
      }

      db.update(giftBasketAssemblies)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledByUserId: input.userId,
        })
        .where(eq(giftBasketAssemblies.id, input.assemblyId))
        .run();
    })();

    return {
      ok: true,
      assemblyId: input.assemblyId,
      preview: buildAssemblyPreview({
        basketId: assembly.basketId,
        basketName: name,
        sellingPrice: assembly.sellingPriceSnapshot,
        quantity: assembly.quantity,
        assemblyMode: (assembly.assemblyMode as AssemblyMode) || "preassembled",
        components: [],
      }),
      success:
        "Montaje anulado: se han revertido los movimientos de stock de componentes.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "No se pudo anular el montaje.",
    };
  }
}
