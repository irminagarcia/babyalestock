import { requireUser } from "@/lib/auth";
import { loadProductFormOptions } from "@/lib/product-form-options";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const { categories, subcategories, suppliers } =
    await loadProductFormOptions();

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
          categories={categories}
          subcategories={subcategories}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
