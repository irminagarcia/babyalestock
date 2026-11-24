import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { loadProductFormOptions } from "@/lib/product-form-options";
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

  const { categories: cats, subcategories: subs, suppliers: sups } =
    await loadProductFormOptions();

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
          initial={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            categoryId: product.categoryId,
            subcategoryId: product.subcategoryId,
            brand: product.brand,
            variant: product.variant,
            size: product.size,
            color: product.color,
            supplierId: product.supplierId,
            purchaseCost: product.purchaseCost,
            sellingPrice: product.sellingPrice,
            currentStock: product.currentStock,
            minStock: product.minStock,
            storageLocation: product.storageLocation,
            notes: product.notes,
            usage: product.usage,
            status: product.status,
            photoPath: product.photoPath,
          }}
          returnTo={returnTo}
          initialError={query.error}
          categories={cats}
          subcategories={subs}
          suppliers={sups}
        />
      </div>
    </div>
  );
}
