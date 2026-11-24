import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ensureHostedSchema } from "@/db/ensure-hosted-schema";
import { categories, subcategories, suppliers } from "@/db/schema";

export type FormOption = { id: number; name: string };
export type FormSubOption = { id: number; name: string; categoryId: number };

/**
 * Options for ProductForm dropdowns.
 * Never SELECT * on suppliers (missing fiscal columns → Workers 500).
 * ensureHostedSchema is best-effort; queries fall back to [] on failure
 * so /productos/nuevo and /editar still render.
 */
export async function loadProductFormOptions(): Promise<{
  categories: FormOption[];
  subcategories: FormSubOption[];
  suppliers: FormOption[];
}> {
  try {
    await ensureHostedSchema();
  } catch {
    /* continue — id/name selects do not need fiscal columns */
  }

  const db = getDb();
  try {
    const [cats, subs, sups] = await Promise.all([
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.isActive, true)),
      db
        .select({
          id: subcategories.id,
          name: subcategories.name,
          categoryId: subcategories.categoryId,
        })
        .from(subcategories)
        .where(eq(subcategories.isActive, true)),
      db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.isActive, true)),
    ]);
    return { categories: cats, subcategories: subs, suppliers: sups };
  } catch {
    return { categories: [], subcategories: [], suppliers: [] };
  }
}
