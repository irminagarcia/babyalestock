"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, getSqlite } from "@/db/client";
import {
  products,
  supplierDeliveries,
  supplierDeliveryLines,
  suppliers,
  type AllocationMethod,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  computeDeliveryCosts,
  weightedAverageLandedCost,
  type DeliveryLineInput,
} from "@/lib/landed-cost";
import { createStockMovement } from "@/lib/stock";

function parseNum(v: FormDataEntryValue | null, fallback = 0): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function parseLinesFromForm(formData: FormData): DeliveryLineInput[] {
  const raw = String(formData.get("linesJson") || "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row, i) => {
    const r = row as Record<string, unknown>;
    return {
      key: String(r.key ?? r.id ?? i),
      productId: Number(r.productId),
      quantity: Number(r.quantity),
      unitPurchaseNet: Number(r.unitPurchaseNet),
      vatRate: Number(r.vatRate ?? 21),
      vatRecoverable: r.vatRecoverable !== false && r.vatRecoverable !== 0,
    };
  });
}

export type DeliveryFormState = {
  error?: string;
  success?: string;
  deliveryId?: number;
};

export async function saveDraftDelivery(
  _prev: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : null;
  const supplierId = Number(formData.get("supplierId"));
  const deliveryDate = String(formData.get("deliveryDate") || "").trim();
  const reference = String(formData.get("reference") || "").trim() || null;
  const shippingCost = Math.max(0, parseNum(formData.get("shippingCost")));
  const otherCosts = Math.max(0, parseNum(formData.get("otherCosts")));
  const allocationMethod = (String(formData.get("allocationMethod") || "by_net_value") ===
  "by_quantity"
    ? "by_quantity"
    : "by_net_value") as AllocationMethod;
  const notes = String(formData.get("notes") || "").trim() || null;
  const lines = parseLinesFromForm(formData).filter(
    (l) => Number.isFinite(l.productId) && l.quantity > 0,
  );

  if (!Number.isFinite(supplierId)) {
    return { error: "Seleccione un proveedor." };
  }
  if (!deliveryDate) {
    return { error: "Indique la fecha de entrega." };
  }
  if (lines.length === 0) {
    return { error: "Añada al menos una línea de producto." };
  }
  for (const line of lines) {
    if (!Number.isFinite(line.unitPurchaseNet) || line.unitPurchaseNet < 0) {
      return { error: "El precio de compra debe ser un número ≥ 0." };
    }
  }

  const computed = computeDeliveryCosts(
    { shippingCost, otherCosts, allocationMethod },
    lines,
  );
  const db = getDb();
  const sqlite = getSqlite();
  const now = new Date().toISOString();

  try {
    const deliveryId = sqlite.transaction(() => {
      if (id) {
        const existing = db
          .select()
          .from(supplierDeliveries)
          .where(eq(supplierDeliveries.id, id))
          .get();
        if (!existing) throw new Error("Entrega no encontrada.");
        if (existing.status !== "draft") {
          throw new Error("Solo se pueden editar entregas en borrador.");
        }
        db.update(supplierDeliveries)
          .set({
            supplierId,
            deliveryDate,
            reference,
            shippingCost,
            otherCosts,
            allocationMethod,
            notes,
            updatedAt: now,
          })
          .where(eq(supplierDeliveries.id, id))
          .run();
        db.delete(supplierDeliveryLines)
          .where(eq(supplierDeliveryLines.deliveryId, id))
          .run();
        computed.lines.forEach((line, sortOrder) => {
          db.insert(supplierDeliveryLines)
            .values({
              deliveryId: id,
              productId: line.productId,
              quantity: line.quantity,
              unitPurchaseNet: line.unitPurchaseNet,
              vatRate: line.vatRate,
              vatRecoverable: line.vatRecoverable,
              lineNet: line.lineNet,
              vatAmount: line.vatAmount,
              allocatedOverhead: line.allocatedOverhead,
              nonRecoverableTax: line.nonRecoverableTax,
              landedUnitCost: line.landedUnitCost,
              sortOrder,
            })
            .run();
        });
        return id;
      }

      const created = db
        .insert(supplierDeliveries)
        .values({
          supplierId,
          deliveryDate,
          reference,
          shippingCost,
          otherCosts,
          allocationMethod,
          notes,
          status: "draft",
          createdByUserId: user.id,
        })
        .returning()
        .get();

      computed.lines.forEach((line, sortOrder) => {
        db.insert(supplierDeliveryLines)
          .values({
            deliveryId: created.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPurchaseNet: line.unitPurchaseNet,
            vatRate: line.vatRate,
            vatRecoverable: line.vatRecoverable,
            lineNet: line.lineNet,
            vatAmount: line.vatAmount,
            allocatedOverhead: line.allocatedOverhead,
            nonRecoverableTax: line.nonRecoverableTax,
            landedUnitCost: line.landedUnitCost,
            sortOrder,
          })
          .run();
      });
      return created.id;
    })();

    revalidatePath("/entregas");
    revalidatePath(`/entregas/${deliveryId}`);
    return {
      success: "Borrador de entrega guardado.",
      deliveryId,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo guardar la entrega.",
    };
  }
}

/**
 * Confirm delivery: recalculate costs, receive stock via movements (idempotent),
 * update purchase_cost + weighted-average landed_cost.
 */
export async function confirmDelivery(deliveryId: number): Promise<DeliveryFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const sqlite = getSqlite();

  const delivery = db
    .select()
    .from(supplierDeliveries)
    .where(eq(supplierDeliveries.id, deliveryId))
    .get();

  if (!delivery) return { error: "Entrega no encontrada." };
  if (delivery.status === "confirmed") {
    return { success: "La entrega ya estaba confirmada.", deliveryId };
  }
  if (delivery.status !== "draft") {
    return { error: "Solo se pueden confirmar entregas en borrador." };
  }

  const lines = db
    .select()
    .from(supplierDeliveryLines)
    .where(eq(supplierDeliveryLines.deliveryId, deliveryId))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (lines.length === 0) {
    return { error: "La entrega no tiene líneas." };
  }

  const computed = computeDeliveryCosts(
    {
      shippingCost: delivery.shippingCost,
      otherCosts: delivery.otherCosts,
      allocationMethod: delivery.allocationMethod as AllocationMethod,
    },
    lines.map((l) => ({
      key: String(l.id),
      productId: l.productId,
      quantity: l.quantity,
      unitPurchaseNet: l.unitPurchaseNet,
      vatRate: l.vatRate,
      vatRecoverable: l.vatRecoverable,
    })),
  );

  try {
    sqlite.transaction(() => {
      const now = new Date().toISOString();
      const byKey = new Map(computed.lines.map((l) => [l.key, l]));

      for (const line of lines) {
        const c = byKey.get(String(line.id));
        if (!c) throw new Error("Error al recalcular costes de línea.");

        db.update(supplierDeliveryLines)
          .set({
            lineNet: c.lineNet,
            vatAmount: c.vatAmount,
            allocatedOverhead: c.allocatedOverhead,
            nonRecoverableTax: c.nonRecoverableTax,
            landedUnitCost: c.landedUnitCost,
          })
          .where(eq(supplierDeliveryLines.id, line.id))
          .run();

        const product = db
          .select()
          .from(products)
          .where(eq(products.id, line.productId))
          .get();
        if (!product) throw new Error(`Producto #${line.productId} no encontrado.`);

        const stockBefore = product.currentStock;
        const oldLanded = product.landedCost ?? product.purchaseCost;
        const idempotencyKey = `delivery:${deliveryId}:line:${line.id}:received`;

        const movement = createStockMovement({
          productId: line.productId,
          type: "received",
          quantity: line.quantity,
          reason: `Entrada de proveedor #${deliveryId}${
            delivery.reference ? ` (${delivery.reference})` : ""
          }`,
          occurredAt: delivery.deliveryDate,
          userId: user.id,
          idempotencyKey,
          sourceType: "delivery_line",
          sourceId: line.id,
          skipTransaction: true,
        });

        if (!movement.ok) {
          throw new Error(movement.error);
        }

        const newLanded = weightedAverageLandedCost(
          stockBefore,
          oldLanded,
          line.quantity,
          c.landedUnitCost,
        );

        // Re-read after movement for consistency of stock; WA uses stockBefore intentionally.
        db.update(products)
          .set({
            purchaseCost: c.unitPurchaseNet,
            landedCost: newLanded,
            supplierId: product.supplierId ?? delivery.supplierId,
            updatedAt: now,
          })
          .where(eq(products.id, line.productId))
          .run();

        db.update(supplierDeliveryLines)
          .set({ stockMovementId: movement.movementId })
          .where(eq(supplierDeliveryLines.id, line.id))
          .run();
      }

      db.update(supplierDeliveries)
        .set({
          status: "confirmed",
          confirmedAt: now,
          confirmedByUserId: user.id,
          updatedAt: now,
        })
        .where(eq(supplierDeliveries.id, deliveryId))
        .run();
    })();

    revalidatePath("/entregas");
    revalidatePath(`/entregas/${deliveryId}`);
    revalidatePath("/productos");
    revalidatePath("/panel");
    revalidatePath("/movimientos");
    return {
      success: "Entrega confirmada: stock recibido y costes de adquisición actualizados.",
      deliveryId,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo confirmar la entrega.",
    };
  }
}

export async function deleteDraftDelivery(deliveryId: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const row = db
    .select()
    .from(supplierDeliveries)
    .where(eq(supplierDeliveries.id, deliveryId))
    .get();
  if (!row) return { error: "Entrega no encontrada." };
  if (row.status !== "draft") {
    return { error: "Solo se pueden eliminar borradores." };
  }
  db.delete(supplierDeliveries).where(eq(supplierDeliveries.id, deliveryId)).run();
  revalidatePath("/entregas");
  return { ok: true as const };
}

export async function listDeliveries() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  return db
    .select({
      id: supplierDeliveries.id,
      deliveryDate: supplierDeliveries.deliveryDate,
      reference: supplierDeliveries.reference,
      shippingCost: supplierDeliveries.shippingCost,
      otherCosts: supplierDeliveries.otherCosts,
      allocationMethod: supplierDeliveries.allocationMethod,
      status: supplierDeliveries.status,
      supplierName: suppliers.name,
      confirmedAt: supplierDeliveries.confirmedAt,
    })
    .from(supplierDeliveries)
    .innerJoin(suppliers, eq(supplierDeliveries.supplierId, suppliers.id))
    .orderBy(desc(supplierDeliveries.deliveryDate), desc(supplierDeliveries.id))
    .all();
}

export async function getDeliveryDetail(id: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const delivery = db
    .select({
      id: supplierDeliveries.id,
      supplierId: supplierDeliveries.supplierId,
      supplierName: suppliers.name,
      deliveryDate: supplierDeliveries.deliveryDate,
      reference: supplierDeliveries.reference,
      shippingCost: supplierDeliveries.shippingCost,
      otherCosts: supplierDeliveries.otherCosts,
      allocationMethod: supplierDeliveries.allocationMethod,
      status: supplierDeliveries.status,
      notes: supplierDeliveries.notes,
      confirmedAt: supplierDeliveries.confirmedAt,
    })
    .from(supplierDeliveries)
    .innerJoin(suppliers, eq(supplierDeliveries.supplierId, suppliers.id))
    .where(eq(supplierDeliveries.id, id))
    .get();

  if (!delivery) return null;

  const lines = db
    .select({
      id: supplierDeliveryLines.id,
      productId: supplierDeliveryLines.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: supplierDeliveryLines.quantity,
      unitPurchaseNet: supplierDeliveryLines.unitPurchaseNet,
      vatRate: supplierDeliveryLines.vatRate,
      vatRecoverable: supplierDeliveryLines.vatRecoverable,
      lineNet: supplierDeliveryLines.lineNet,
      vatAmount: supplierDeliveryLines.vatAmount,
      allocatedOverhead: supplierDeliveryLines.allocatedOverhead,
      nonRecoverableTax: supplierDeliveryLines.nonRecoverableTax,
      landedUnitCost: supplierDeliveryLines.landedUnitCost,
      stockMovementId: supplierDeliveryLines.stockMovementId,
      sortOrder: supplierDeliveryLines.sortOrder,
    })
    .from(supplierDeliveryLines)
    .innerJoin(products, eq(supplierDeliveryLines.productId, products.id))
    .where(eq(supplierDeliveryLines.deliveryId, id))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { delivery, lines };
}
