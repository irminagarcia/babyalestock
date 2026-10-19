"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq, ne } from "drizzle-orm";
import { getDb, getSqlite } from "@/db/client";
import {
  giftBasketComponents,
  giftBaskets,
  products,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { estimateBasketCost, resolveUnitCost } from "@/lib/basket-cost";

export type BasketFormState = {
  error?: string;
  success?: string;
  basketId?: number;
};

type ComponentInput = {
  productId: number;
  quantity: number;
  notes?: string | null;
};

function parseComponents(formData: FormData): ComponentInput[] {
  const raw = String(formData.get("componentsJson") || "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        productId: Number(r.productId),
        quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)),
        notes: String(r.notes || "").trim() || null,
      };
    })
    .filter((c) => Number.isFinite(c.productId) && c.quantity > 0);
}

export async function saveBasketRecipe(
  _prev: BasketFormState,
  formData: FormData,
): Promise<BasketFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : null;
  const name = String(formData.get("name") || "").trim();
  const sku = String(formData.get("sku") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const sellingRaw = String(formData.get("sellingPrice") || "")
    .trim()
    .replace(",", ".");
  const sellingPrice = sellingRaw ? Number(sellingRaw) : null;
  const statusRaw = String(formData.get("status") || "active");
  const status =
    statusRaw === "inactive" || statusRaw === "draft" ? statusRaw : "active";
  const components = parseComponents(formData);

  if (!name) return { error: "El nombre de la cesta es obligatorio." };
  if (sellingPrice != null && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) {
    return { error: "El precio de venta no es válido." };
  }
  if (components.length === 0) {
    return { error: "Añada al menos un componente (producto + cantidad)." };
  }

  const productIds = new Set(components.map((c) => c.productId));
  if (productIds.size !== components.length) {
    return { error: "No repita el mismo producto en varias líneas; sume cantidades." };
  }

  const db = getDb();
  const sqlite = getSqlite();
  const now = new Date().toISOString();

  if (sku) {
    const clash = db
      .select()
      .from(giftBaskets)
      .where(eq(giftBaskets.sku, sku))
      .get();
    if (clash && clash.id !== id) {
      return { error: "Ya existe una cesta con ese SKU." };
    }
  }

  try {
    const basketId = sqlite.transaction(() => {
      if (id) {
        const existing = db
          .select()
          .from(giftBaskets)
          .where(eq(giftBaskets.id, id))
          .get();
        if (!existing) throw new Error("Receta no encontrada.");

        db.update(giftBaskets)
          .set({
            name,
            sku,
            description,
            notes,
            sellingPrice,
            status,
            updatedAt: now,
          })
          .where(eq(giftBaskets.id, id))
          .run();

        db.delete(giftBasketComponents)
          .where(eq(giftBasketComponents.basketId, id))
          .run();

        components.forEach((c, sortOrder) => {
          db.insert(giftBasketComponents)
            .values({
              basketId: id,
              productId: c.productId,
              quantity: c.quantity,
              notes: c.notes,
              sortOrder,
            })
            .run();
        });
        return id;
      }

      const created = db
        .insert(giftBaskets)
        .values({
          name,
          sku,
          description,
          notes,
          sellingPrice,
          status,
          assemblyMode: "mto",
        })
        .returning()
        .get();

      components.forEach((c, sortOrder) => {
        db.insert(giftBasketComponents)
          .values({
            basketId: created.id,
            productId: c.productId,
            quantity: c.quantity,
            notes: c.notes,
            sortOrder,
          })
          .run();
      });
      return created.id;
    })();

    revalidatePath("/cestas");
    revalidatePath(`/cestas/${basketId}`);
    return {
      success: "Receta de cesta guardada (estimación actualizada; sin movimiento de stock).",
      basketId,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo guardar la receta.",
    };
  }
}

export async function setBasketStatus(basketId: number, status: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (status !== "active" && status !== "inactive" && status !== "draft") {
    return { error: "Estado no válido." };
  }
  getDb()
    .update(giftBaskets)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(giftBaskets.id, basketId))
    .run();
  revalidatePath("/cestas");
  revalidatePath(`/cestas/${basketId}`);
  return { ok: true as const };
}

export async function deleteBasketRecipe(basketId: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Safe: no assemblies yet; deleting recipe does not touch stock movements
  getDb().delete(giftBaskets).where(eq(giftBaskets.id, basketId)).run();
  revalidatePath("/cestas");
  return { ok: true as const };
}

export async function listBasketRecipes() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const baskets = db
    .select()
    .from(giftBaskets)
    .orderBy(desc(giftBaskets.updatedAt))
    .all();

  return baskets.map((b) => {
    const comps = db
      .select({
        quantity: giftBasketComponents.quantity,
        landedCost: products.landedCost,
        purchaseCost: products.purchaseCost,
      })
      .from(giftBasketComponents)
      .innerJoin(products, eq(giftBasketComponents.productId, products.id))
      .where(eq(giftBasketComponents.basketId, b.id))
      .all();

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
      ...b,
      componentCount: comps.length,
      totalComponentCost: estimate.totalComponentCost,
      estimatedProfit: estimate.estimatedProfit,
      estimatedMarginPct: estimate.estimatedMarginPct,
      missingCostCount: estimate.missingCostCount,
    };
  });
}

export async function getBasketDetail(id: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const basket = db.select().from(giftBaskets).where(eq(giftBaskets.id, id)).get();
  if (!basket) return null;

  const components = db
    .select({
      id: giftBasketComponents.id,
      productId: giftBasketComponents.productId,
      quantity: giftBasketComponents.quantity,
      notes: giftBasketComponents.notes,
      sortOrder: giftBasketComponents.sortOrder,
      productName: products.name,
      productSku: products.sku,
      usage: products.usage,
      landedCost: products.landedCost,
      purchaseCost: products.purchaseCost,
      currentStock: products.currentStock,
      status: products.status,
    })
    .from(giftBasketComponents)
    .innerJoin(products, eq(giftBasketComponents.productId, products.id))
    .where(eq(giftBasketComponents.basketId, id))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const estimate = estimateBasketCost(
    components.map((c) => {
      const { unit, missing } = resolveUnitCost(c.landedCost, c.purchaseCost);
      return {
        key: String(c.id),
        productId: c.productId,
        productName: c.productName,
        quantity: c.quantity,
        unitLandedCost: missing ? null : unit,
        missingCost: missing,
      };
    }),
    basket.sellingPrice,
  );

  return { basket, components, estimate };
}

/** Products suitable as basket components (not archived). */
export async function listComponentProductOptions() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      usage: products.usage,
      landedCost: products.landedCost,
      purchaseCost: products.purchaseCost,
      currentStock: products.currentStock,
    })
    .from(products)
    .where(ne(products.status, "archived"))
    .all()
    .sort((a, b) => {
      const rank = (u: string) =>
        u === "gift_component" || u === "both" ? 0 : 1;
      const d = rank(a.usage) - rank(b.usage);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, "es");
    });
}
