import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import { categories, products, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";
import { StockCorrectionForm } from "@/components/stock-correction-form";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    stockError?: string;
    stockOk?: string;
  }>;
}) {
  await requireUser();
  const { id: idRaw } = await params;
  const query = await searchParams;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const product = await one(db.select().from(products).where(eq(products.id, id)));
  if (!product) notFound();

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

  const archived = product.status === "archived";
  const returnTo = `/productos/${id}/editar`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Editar producto</h1>
        <p className="text-muted-foreground">{product.name}</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <StockCorrectionForm
          productId={product.id}
          currentStock={product.currentStock}
          returnTo={returnTo}
          initialError={query.stockError}
          initialSuccess={query.stockOk}
          disabled={archived}
        />
        {archived && (
          <p className="mt-3 text-sm text-muted-foreground">
            Este producto está archivado; restaurelo antes de corregir
            existencias.
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <ProductForm
          initial={product}
          returnTo={returnTo}
          initialError={query.error}
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
