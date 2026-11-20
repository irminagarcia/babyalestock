import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
  await requireUser();
  const db = getDb();
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true));
  const subs = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.isActive, true));
  const sups = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isActive, true));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Añadir producto</h1>
        <p className="text-muted-foreground">
          Complete los datos del catálogo. Los campos opcionales pueden quedar
          vacíos.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <ProductForm
          categories={cats.map((c) => ({ id: c.id, name: c.name }))}
          subcategories={subs.map((s) => ({
            id: s.id,
            name: s.name,
            categoryId: s.categoryId,
          }))}
          suppliers={sups.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
