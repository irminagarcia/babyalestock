import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const db = getDb();
  // Same as /editar: never SELECT * on suppliers (fiscal columns may be absent).
  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true));
  const subs = await db
    .select({
      id: subcategories.id,
      name: subcategories.name,
      categoryId: subcategories.categoryId,
    })
    .from(subcategories)
    .where(eq(subcategories.isActive, true));
  const sups = await db
    .select({ id: suppliers.id, name: suppliers.name })
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
          returnTo="/productos/nuevo"
          initialError={params.error}
          categories={cats}
          subcategories={subs}
          suppliers={sups}
        />
      </div>
    </div>
  );
}
