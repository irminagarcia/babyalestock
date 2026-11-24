import { listComponentProductOptions } from "@/lib/actions/baskets";
import { BasketForm } from "@/components/basket-form";

export default async function NewBasketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const products = await listComponentProductOptions();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Nueva receta de cesta</h1>
        <p className="text-muted-foreground">
          Defina componentes y precio de venta. El coste se calcula solo desde
          el coste de adquisición de cada producto.
        </p>
      </div>
      <BasketForm
        products={products}
        returnTo="/cestas/nueva"
        initialError={query.error}
      />
    </div>
  );
}
