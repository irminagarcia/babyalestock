"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import {
  giftBasketAssemblies,
  giftBasketAssemblyLines,
  giftBasketComponents,
  giftBaskets,
  products,
  users,
  type AssemblyMode,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  buildAssemblyPreview,
  type AssemblyPreview,
} from "@/lib/assembly";
import {
  executeCancelAssembly,
  executeConfirmAssembly,
} from "@/lib/assembly-service";

export type AssemblyFormState = {
  error?: string;
  success?: string;
  assemblyId?: number;
  preview?: AssemblyPreview;
};

function parseMode(raw: string): AssemblyMode {
  return raw === "mto" ? "mto" : "preassembled";
}

async function loadBasketComponents(basketId: number) {
  const db = getDb();
  return await db
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
    .where(eq(giftBasketComponents.basketId, basketId));
}

function revalidateAssemblyPaths(assemblyId?: number, basketId?: number) {
  revalidatePath("/montaje");
  if (assemblyId) revalidatePath(`/montaje/${assemblyId}`);
  revalidatePath("/cestas");
  if (basketId) revalidatePath(`/cestas/${basketId}`);
  revalidatePath("/productos");
  revalidatePath("/movimientos");
  revalidatePath("/rentabilidad");
  revalidatePath("/panel");
}

export async function previewAssembly(opts: {
  basketId: number;
  quantity: number;
  assemblyMode: AssemblyMode;
}): Promise<AssemblyFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const basket = await one(
    db.select().from(giftBaskets).where(eq(giftBaskets.id, opts.basketId)),
  );
  if (!basket) return { error: "Receta no encontrada." };
  if (basket.status !== "active") {
    return { error: "Solo se pueden montar recetas activas." };
  }

  const comps = await loadBasketComponents(basket.id);
  if (comps.some((c) => c.status === "archived")) {
    return {
      error:
        "La receta incluye un producto archivado. Actualice la receta antes de montar.",
    };
  }

  const preview = buildAssemblyPreview({
    basketId: basket.id,
    basketName: basket.name,
    sellingPrice: basket.sellingPrice,
    quantity: opts.quantity,
    assemblyMode: opts.assemblyMode,
    components: comps,
  });

  return { preview };
}

export async function confirmAssembly(
  _prev: AssemblyFormState,
  formData: FormData,
): Promise<AssemblyFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const basketId = Number(formData.get("basketId"));
  const quantity = Math.floor(Number(formData.get("quantity")));
  const assemblyMode = parseMode(String(formData.get("assemblyMode") || ""));
  const notes = String(formData.get("notes") || "").trim() || null;
  const idempotencyKey =
    String(formData.get("idempotencyKey") || "").trim() || randomUUID();

  if (!Number.isFinite(basketId)) {
    return { error: "Seleccione una receta de cesta." };
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: "Indique una cantidad de cestas ≥ 1." };
  }

  const result = await executeConfirmAssembly({
    basketId,
    quantity,
    assemblyMode,
    userId: user.id,
    notes,
    idempotencyKey,
  });

  if (!result.ok) {
    return { error: result.error, preview: result.preview };
  }

  revalidateAssemblyPaths(result.assemblyId, basketId);
  return {
    success: result.success,
    assemblyId: result.assemblyId,
    preview: result.preview,
  };
}

export async function cancelAssembly(
  assemblyId: number,
): Promise<AssemblyFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await executeCancelAssembly({
    assemblyId,
    userId: user.id,
  });

  if (!result.ok) return { error: result.error };

  const db = getDb();
  const row = await one(
    db
      .select({ basketId: giftBasketAssemblies.basketId })
      .from(giftBasketAssemblies)
      .where(eq(giftBasketAssemblies.id, assemblyId)),
  );

  revalidateAssemblyPaths(assemblyId, row?.basketId);
  return { success: result.success, assemblyId };
}

export async function listAssemblies(opts?: {
  status?: string | null;
  basketId?: number | null;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const conditions = [];
  if (opts?.status && opts.status !== "all") {
    conditions.push(eq(giftBasketAssemblies.status, opts.status));
  }
  if (opts?.basketId) {
    conditions.push(eq(giftBasketAssemblies.basketId, opts.basketId));
  }

  return await db
    .select({
      id: giftBasketAssemblies.id,
      basketId: giftBasketAssemblies.basketId,
      quantity: giftBasketAssemblies.quantity,
      totalComponentCostSnapshot:
        giftBasketAssemblies.totalComponentCostSnapshot,
      sellingPriceSnapshot: giftBasketAssemblies.sellingPriceSnapshot,
      recipeNameSnapshot: giftBasketAssemblies.recipeNameSnapshot,
      assemblyMode: giftBasketAssemblies.assemblyMode,
      assembledAt: giftBasketAssemblies.assembledAt,
      status: giftBasketAssemblies.status,
      notes: giftBasketAssemblies.notes,
      basketName: giftBaskets.name,
      userName: users.displayName,
      finishedStock: giftBaskets.finishedStock,
    })
    .from(giftBasketAssemblies)
    .innerJoin(giftBaskets, eq(giftBasketAssemblies.basketId, giftBaskets.id))
    .leftJoin(users, eq(giftBasketAssemblies.assembledByUserId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(giftBasketAssemblies.assembledAt));
}

export async function getAssemblyDetail(id: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const assembly = await one(
    db
    .select({
      id: giftBasketAssemblies.id,
      basketId: giftBasketAssemblies.basketId,
      quantity: giftBasketAssemblies.quantity,
      totalComponentCostSnapshot:
        giftBasketAssemblies.totalComponentCostSnapshot,
      sellingPriceSnapshot: giftBasketAssemblies.sellingPriceSnapshot,
      recipeNameSnapshot: giftBasketAssemblies.recipeNameSnapshot,
      assemblyMode: giftBasketAssemblies.assemblyMode,
      assembledAt: giftBasketAssemblies.assembledAt,
      status: giftBasketAssemblies.status,
      notes: giftBasketAssemblies.notes,
      cancelledAt: giftBasketAssemblies.cancelledAt,
      cancelledByUserId: giftBasketAssemblies.cancelledByUserId,
      idempotencyKey: giftBasketAssemblies.idempotencyKey,
      basketName: giftBaskets.name,
      finishedStock: giftBaskets.finishedStock,
      userName: users.displayName,
    })
    .from(giftBasketAssemblies)
    .innerJoin(giftBaskets, eq(giftBasketAssemblies.basketId, giftBaskets.id))
    .leftJoin(users, eq(giftBasketAssemblies.assembledByUserId, users.id))
    .where(eq(giftBasketAssemblies.id, id)),
  );

  if (!assembly) return null;

  const lines = await db
    .select({
      id: giftBasketAssemblyLines.id,
      productId: giftBasketAssemblyLines.productId,
      quantity: giftBasketAssemblyLines.quantity,
      recipeQtyPerUnit: giftBasketAssemblyLines.recipeQtyPerUnit,
      unitLandedCostSnapshot: giftBasketAssemblyLines.unitLandedCostSnapshot,
      lineCostSnapshot: giftBasketAssemblyLines.lineCostSnapshot,
      stockMovementId: giftBasketAssemblyLines.stockMovementId,
      productName: products.name,
      productSku: products.sku,
      currentStock: products.currentStock,
    })
    .from(giftBasketAssemblyLines)
    .innerJoin(products, eq(giftBasketAssemblyLines.productId, products.id))
    .where(eq(giftBasketAssemblyLines.assemblyId, id));

  let cancelledByName: string | null = null;
  if (assembly.cancelledByUserId) {
    const u = await one(
      db.select().from(users).where(eq(users.id, assembly.cancelledByUserId)),
    );
    cancelledByName = u?.displayName ?? null;
  }

  return { assembly, lines, cancelledByName };
}

export async function listActiveBasketsForAssembly() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  return await db
    .select({
      id: giftBaskets.id,
      name: giftBaskets.name,
      sku: giftBaskets.sku,
      sellingPrice: giftBaskets.sellingPrice,
      finishedStock: giftBaskets.finishedStock,
      assemblyMode: giftBaskets.assemblyMode,
    })
    .from(giftBaskets)
    .where(eq(giftBaskets.status, "active"))
    .orderBy(giftBaskets.name);
}
