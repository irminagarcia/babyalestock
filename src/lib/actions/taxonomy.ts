"use server";

import { revalidatePath } from "next/cache";
import { count, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exec, one, withTransaction } from "@/db/query";
import { categories, products, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function createCategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) return { ok: false as const, error: "El nombre es obligatorio." };
  try {
    await exec(getDb().insert(categories).values({ name, description }));
  } catch {
    return { ok: false as const, error: "Ya existe una categoría con ese nombre." };
  }
  revalidatePath("/categorias");
  revalidatePath("/productos");
  return { ok: true as const };
}

export type UpdateCategoryResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

/** Update existing category fields (name, description, isActive). */
export async function updateCategory(
  formData: FormData,
): Promise<UpdateCategoryResult> {
  await requireUser();
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const isActiveRaw = formData.get("isActive");
  const isActive =
    isActiveRaw === "on" ||
    isActiveRaw === "1" ||
    isActiveRaw === "true" ||
    isActiveRaw === "yes";

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { ok: false, error: "Categoría no válida." };
  }
  if (!name) {
    return { ok: false, error: "El nombre es obligatorio." };
  }

  const existing = await one(
    getDb().select().from(categories).where(eq(categories.id, categoryId)),
  );
  if (!existing) {
    return { ok: false, error: "Categoría no encontrada." };
  }

  try {
    await exec(
      getDb()
        .update(categories)
        .set({ name, description, isActive })
        .where(eq(categories.id, categoryId)),
    );
  } catch {
    return {
      ok: false,
      error: "Ya existe una categoría con ese nombre.",
    };
  }

  revalidatePath("/categorias");
  revalidatePath("/productos");
  return { ok: true, name };
}

export type CategoryDeleteAssessment = {
  categoryId: number;
  name: string;
  productCount: number;
  subcategoryCount: number;
  blockers: string[];
  warnings: string[];
  canDelete: boolean;
};

export type AssessCategoryDeleteResult =
  | ({ ok: true } & CategoryDeleteAssessment)
  | { ok: false; error: string };

async function countProductsLinkedToCategory(
  categoryId: number,
): Promise<{ productCount: number; subcategoryCount: number }> {
  const db = getDb();
  const subs = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId));
  const subIds = subs.map((s) => s.id);

  const productFilter =
    subIds.length > 0
      ? or(
          eq(products.categoryId, categoryId),
          inArray(products.subcategoryId, subIds),
        )
      : eq(products.categoryId, categoryId);

  const row = await one(
    db.select({ n: count() }).from(products).where(productFilter),
  );

  return {
    productCount: Number(row?.n ?? 0),
    subcategoryCount: subs.length,
  };
}

export async function assessCategoryDelete(
  categoryId: number,
): Promise<AssessCategoryDeleteResult> {
  await requireUser();
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { ok: false, error: "Categoría no válida." };
  }

  const cat = await one(
    getDb().select().from(categories).where(eq(categories.id, categoryId)),
  );
  if (!cat) {
    return { ok: false, error: "Categoría no encontrada." };
  }

  const { productCount, subcategoryCount } =
    await countProductsLinkedToCategory(categoryId);

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (productCount > 0) {
    blockers.push(
      `Hay ${productCount} producto(s) en esta categoría o sus subcategorías. Reasígnelos o elimínelos antes de borrar la categoría.`,
    );
  }
  if (subcategoryCount > 0 && productCount === 0) {
    warnings.push(
      `Se eliminarán también ${subcategoryCount} subcategoría(s).`,
    );
  }

  return {
    ok: true,
    categoryId,
    name: cat.name,
    productCount,
    subcategoryCount,
    blockers,
    warnings,
    canDelete: blockers.length === 0,
  };
}

export type DeleteCategoryResult =
  | { ok: true; name: string }
  | { ok: false; error: string; blockers?: string[] };

/**
 * Permanently delete a category when no products reference it (or its
 * subcategories). Subcategories cascade away; products are never orphaned.
 */
export async function deleteCategory(
  categoryId: number,
): Promise<DeleteCategoryResult> {
  await requireUser();
  const assessment = await assessCategoryDelete(categoryId);
  if (!assessment.ok) {
    return { ok: false, error: assessment.error };
  }
  if (!assessment.canDelete) {
    return {
      ok: false,
      error:
        assessment.blockers[0] ||
        "No se puede eliminar esta categoría.",
      blockers: assessment.blockers,
    };
  }

  await withTransaction(async (tx) => {
    // Explicit sub delete keeps SQLite/Postgres behavior aligned; PG also cascades.
    await tx
      .delete(subcategories)
      .where(eq(subcategories.categoryId, categoryId));
    await tx.delete(categories).where(eq(categories.id, categoryId));
  });

  revalidatePath("/categorias");
  revalidatePath("/productos");
  return { ok: true, name: assessment.name };
}

export async function createSubcategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  const categoryId = Number(formData.get("categoryId"));
  if (!name || !Number.isFinite(categoryId)) {
    return { ok: false as const, error: "Indique categoría y nombre." };
  }
  try {
    await exec(getDb().insert(subcategories).values({ name, categoryId }));
  } catch {
    return {
      ok: false as const,
      error: "Ya existe esa subcategoría en la categoría.",
    };
  }
  revalidatePath("/categorias");
  revalidatePath("/productos");
  return { ok: true as const };
}

function optionalText(formData: FormData, key: string): string | null {
  return String(formData.get(key) || "").trim() || null;
}

export async function createSupplier(formData: FormData) {
  await requireUser();
  const { ensureHostedSchema } = await import("@/db/ensure-hosted-schema");
  await ensureHostedSchema();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false as const, error: "El nombre es obligatorio." };
  try {
    await exec(
      getDb()
        .insert(suppliers)
        .values({
          name,
          contactName: optionalText(formData, "contactName"),
          email: optionalText(formData, "email"),
          phone: optionalText(formData, "phone"),
          taxId: optionalText(formData, "taxId"),
          legalName: optionalText(formData, "legalName"),
          fiscalAddress: optionalText(formData, "fiscalAddress"),
          country: optionalText(formData, "country") || "España",
          notes: optionalText(formData, "notes"),
        }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(msg)) {
      return {
        ok: false as const,
        error: "Ya existe un proveedor con ese nombre.",
      };
    }
    return {
      ok: false as const,
      error:
        "No se pudo guardar el proveedor. Si acaba de desplegar, recargue y pruebe de nuevo.",
    };
  }
  revalidatePath("/proveedores");
  revalidatePath("/productos");
  return { ok: true as const };
}

export async function toggleCategory(id: number, isActive: boolean) {
  await requireUser();
  await exec(
    getDb()
      .update(categories)
      .set({ isActive })
      .where(eq(categories.id, id)),
  );
  revalidatePath("/categorias");
  return { ok: true as const };
}

export async function toggleSupplier(id: number, isActive: boolean) {
  await requireUser();
  await exec(
    getDb()
      .update(suppliers)
      .set({ isActive })
      .where(eq(suppliers.id, id)),
  );
  revalidatePath("/proveedores");
  return { ok: true as const };
}
