import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBasketDetail,
  listComponentProductOptions,
} from "@/lib/actions/baskets";
import { formatEur, formatNumber } from "@/lib/utils";
import { usageLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BasketForm } from "@/components/basket-form";
import { BasketStatusButtons } from "./status-buttons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabel: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
  draft: "Borrador",
};

export default async function BasketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { id: idRaw } = await params;
  const { editar } = await searchParams;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const detail = await getBasketDetail(id);
  if (!detail) notFound();
  const { basket, components, estimate } = detail;
  const editing = editar === "1";
  const products = editing ? await listComponentProductOptions() : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/cestas" className="hover:underline">
              Cestas regalo
            </Link>{" "}
            / receta
          </p>
          <h1 className="font-display text-3xl">{basket.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              variant={
                basket.status === "active"
                  ? "success"
                  : basket.status === "draft"
                    ? "secondary"
                    : "outline"
              }
            >
              {statusLabel[basket.status] || basket.status}
            </Badge>
            {basket.sku && <Badge variant="outline">SKU {basket.sku}</Badge>}
          </div>
          {basket.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {basket.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing && (
            <Button asChild>
              <Link href={`/cestas/${basket.id}?editar=1`}>Editar receta</Link>
            </Button>
          )}
          <BasketStatusButtons basketId={basket.id} status={basket.status} />
        </div>
      </div>

      {editing ? (
        <BasketForm
          products={products}
          initial={{
            id: basket.id,
            name: basket.name,
            sku: basket.sku,
            description: basket.description,
            sellingPrice: basket.sellingPrice,
            notes: basket.notes,
            status: basket.status,
            components: components.map((c) => ({
              productId: c.productId,
              quantity: c.quantity,
            })),
          }}
        />
      ) : (
        <>
          <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Coste estimado componentes</p>
              <p className="font-display text-xl">
                {formatEur(estimate.totalComponentCost)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Precio de venta</p>
              <p className="font-medium">
                {basket.sellingPrice != null
                  ? formatEur(basket.sellingPrice)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Beneficio estimado</p>
              <p className="font-medium">
                {estimate.estimatedProfit != null
                  ? formatEur(estimate.estimatedProfit)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Margen estimado</p>
              <p className="font-medium">
                {estimate.estimatedMarginPct != null
                  ? `${estimate.estimatedMarginPct.toLocaleString("es-ES", {
                      maximumFractionDigits: 1,
                    })} %`
                  : "—"}
              </p>
            </div>
          </section>

          {estimate.missingCostCount > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {estimate.missingCostCount} componente(s) sin coste de adquisición
              ni precio de compra.
            </p>
          )}

          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Coste adq. / ud</TableHead>
                  <TableHead>Coste línea</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((c) => {
                  const line = estimate.lines.find(
                    (l) => l.productId === c.productId,
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/productos/${c.productId}`}
                          className="font-medium hover:underline"
                        >
                          {c.productName}
                        </Link>
                        {c.productSku && (
                          <p className="text-xs text-muted-foreground">
                            {c.productSku}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {usageLabels[c.usage as keyof typeof usageLabels] ||
                          c.usage}
                      </TableCell>
                      <TableCell>{formatNumber(c.quantity)}</TableCell>
                      <TableCell>
                        {line?.missingCost
                          ? "—"
                          : formatEur(line?.unitLandedCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatEur(line?.lineCost ?? 0)}
                      </TableCell>
                      <TableCell>{formatNumber(c.currentStock)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Esta vista es una estimación en vivo. Guardar o editar la receta{" "}
            <strong>no descuenta stock</strong>. El montaje de cestas con
            consumo de componentes y coste congelado llegará en una fase
            posterior.
          </p>
        </>
      )}
    </div>
  );
}
