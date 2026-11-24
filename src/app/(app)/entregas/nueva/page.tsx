import { eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { DeliveryForm } from "@/components/delivery-form";

export default async function NewDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const db = getDb();
  const supplierRows = (
    await db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.isActive, true))
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const productRows = (
    await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
      })
      .from(products)
      .where(ne(products.status, "archived"))
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Nueva entrega</h1>
        <p className="text-muted-foreground">
          Guarde un borrador, revise el coste de adquisición y confirme para
          recibir stock (sin duplicar movimientos).
        </p>
      </div>
      <DeliveryForm
        suppliers={supplierRows}
        products={productRows}
        returnTo="/entregas/nueva"
        initialError={query.error}
      />
    </div>
  );
}
