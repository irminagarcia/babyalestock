import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, products, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const product = db.select().from(products).where(eq(products.id, id)).get();
  if (!product) notFound();

  const cats = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .all();
  const subs = db
    .select()
    .from(subcategories)
    .where(eq(subcategories.isActive, true))
    .all();
  const sups = db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .all();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Editar producto</h1>
        <p className="text-muted-foreground">{product.name}</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <ProductForm
          initial={product}
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
