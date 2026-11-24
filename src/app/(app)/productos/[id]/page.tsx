import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { one } from "@/db/query";
import {
  categories,
  products,
  stockMovements,
  subcategories,
  suppliers,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate, formatEur, formatNumber } from "@/lib/utils";
import { estimatedMargin } from "@/lib/landed-cost";
import {
  movementTypeLabels,
  statusLabels,
  usageLabels,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlashMessage } from "@/components/flash-message";
import { ArchiveButtons } from "./archive-buttons";
import { DeleteProductButton } from "./delete-product-button";
import { assessProductDelete } from "@/lib/actions/product-delete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireUser();
  const { id: idRaw } = await params;
  const query = await searchParams;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const product = await one(db.select().from(products).where(eq(products.id, id)));
  if (!product) notFound();

  const deleteAssessment = await assessProductDelete(id);

  const category = product.categoryId
    ? await one(
        db
          .select()
          .from(categories)
          .where(eq(categories.id, product.categoryId)),
      )
    : null;
  const subcategory = product.subcategoryId
    ? await one(
        db
          .select()
          .from(subcategories)
          .where(eq(subcategories.id, product.subcategoryId)),
      )
    : null;
  const supplier = product.supplierId
    ? await one(
        db
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, product.supplierId)),
      )
    : null;

  const history = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      stockBefore: stockMovements.stockBefore,
      stockAfter: stockMovements.stockAfter,
      reason: stockMovements.reason,
      occurredAt: stockMovements.occurredAt,
      userName: users.displayName,
    })
    .from(stockMovements)
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(eq(stockMovements.productId, id))
    .orderBy(desc(stockMovements.occurredAt))
    .limit(50);

  const low = product.currentStock <= product.minStock;
  const landed = product.landedCost ?? product.purchaseCost;
  const margin = estimatedMargin(product.sellingPrice, landed);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/productos" className="hover:underline">
              Productos
            </Link>{" "}
            / ficha
          </p>
          <h1 className="font-display text-3xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              variant={
                product.currentStock === 0
                  ? "destructive"
                  : low
                    ? "warning"
                    : "success"
              }
            >
              Existencias: {formatNumber(product.currentStock)}
            </Badge>
            <Badge variant="secondary">
              {statusLabels[product.status as keyof typeof statusLabels]}
            </Badge>
            <Badge variant="outline">
              {usageLabels[product.usage as keyof typeof usageLabels]}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/movimientos?producto=${product.id}`}>
              Registrar movimiento
            </Link>
          </Button>
          <Button asChild>
            {/* Hard navigation: soft Link to /editar fails on OpenNext Workers */}
            <a href={`/productos/${product.id}/editar`}>Editar</a>
          </Button>
          <ArchiveButtons
            productId={product.id}
            status={product.status}
          />
          {deleteAssessment.ok && (
            <DeleteProductButton
              productId={product.id}
              productName={product.name}
              currentStock={deleteAssessment.currentStock}
              movementCount={deleteAssessment.movementCount}
              basketComponentCount={deleteAssessment.basketComponentCount}
              deliveryLineCount={deleteAssessment.deliveryLineCount}
              assemblyLineCount={deleteAssessment.assemblyLineCount}
              canDelete={deleteAssessment.canDelete}
              blockers={deleteAssessment.blockers}
              warnings={deleteAssessment.warnings}
              returnTo={`/productos/${product.id}`}
            />
          )}
        </div>
      </div>

      {/* Shared with archive/restore (BA-25): delete failures use ?error=, list success ?ok= */}
      <FlashMessage error={query.error} ok={query.ok} />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="rounded-xl border bg-card p-4">
          {product.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photos/${product.photoPath}`}
              alt={product.name}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              Sin foto
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["SKU", product.sku],
              ["Código de barras", product.barcode],
              ["Categoría", category?.name],
              ["Subcategoría", subcategory?.name],
              ["Marca", product.brand],
              ["Variante", product.variant],
              ["Talla", product.size],
              ["Color", product.color],
              ["Proveedor", supplier?.name],
              ["Precio de compra", formatEur(product.purchaseCost)],
              [
                "Coste de adquisición",
                product.landedCost != null
                  ? formatEur(product.landedCost)
                  : product.purchaseCost != null
                    ? `${formatEur(product.purchaseCost)} (sin entregas aún)`
                    : "—",
              ],
              ["Precio de venta", formatEur(product.sellingPrice)],
              [
                "Beneficio estimado",
                margin != null ? formatEur(margin) : "—",
              ],
              ["Stock mínimo", formatNumber(product.minStock)],
              ["Ubicación", product.storageLocation],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 font-medium">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            El beneficio estimado es operativo (precio de venta − coste de
            adquisición) y no sustituye a la contabilidad ni a la liquidación
            de IVA.
          </p>
          {product.notes && (
            <div className="mt-6 border-t pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Notas
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{product.notes}</p>
            </div>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Historial de movimientos</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
            Este producto aún no tiene movimientos. El historial se conserva
            aunque archive el producto.
          </p>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Antes → Después</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.occurredAt)}</TableCell>
                    <TableCell>
                      {movementTypeLabels[
                        m.type as keyof typeof movementTypeLabels
                      ] || m.type}
                    </TableCell>
                    <TableCell>{formatNumber(m.quantity)}</TableCell>
                    <TableCell>
                      {formatNumber(m.stockBefore)} →{" "}
                      {formatNumber(m.stockAfter)}
                    </TableCell>
                    <TableCell>{m.reason || "—"}</TableCell>
                    <TableCell>{m.userName || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
