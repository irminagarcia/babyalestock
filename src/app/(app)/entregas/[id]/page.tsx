import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products, suppliers } from "@/db/schema";
import { getDeliveryDetail } from "@/lib/actions/deliveries";
import { requireUser } from "@/lib/auth";
import { formatEur } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeliveryForm } from "@/components/delivery-form";
import { ConfirmDeliveryButtons } from "./confirm-buttons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabel: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  cancelled: "Anulada",
};

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const detail = await getDeliveryDetail(id);
  if (!detail) notFound();
  const { delivery, lines } = detail;

  const db = getDb();
  const supplierRows = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true));
  const productRows = await db
    .select({ id: products.id, name: products.name, sku: products.sku })
    .from(products)
    .where(ne(products.status, "archived"));

  const totalLanded = lines.reduce(
    (s, l) => s + l.landedUnitCost * l.quantity,
    0,
  );
  const totalRecoverable = lines.reduce(
    (s, l) => s + (l.vatRecoverable ? l.vatAmount : 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/entregas" className="hover:underline">
              Entradas de proveedor
            </Link>{" "}
            / #{delivery.id}
          </p>
          <h1 className="font-display text-3xl">
            Entrega · {delivery.supplierName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              variant={delivery.status === "confirmed" ? "success" : "secondary"}
            >
              {statusLabel[delivery.status] || delivery.status}
            </Badge>
            <Badge variant="outline">{delivery.deliveryDate.slice(0, 10)}</Badge>
            {delivery.reference && (
              <Badge variant="outline">Ref. {delivery.reference}</Badge>
            )}
          </div>
        </div>
        {delivery.status === "draft" && (
          <ConfirmDeliveryButtons deliveryId={delivery.id} />
        )}
      </div>

      {delivery.status === "draft" ? (
        <DeliveryForm
          suppliers={supplierRows}
          products={productRows}
          initial={{
            id: delivery.id,
            supplierId: delivery.supplierId,
            deliveryDate: delivery.deliveryDate,
            reference: delivery.reference,
            shippingCost: delivery.shippingCost,
            otherCosts: delivery.otherCosts,
            allocationMethod: delivery.allocationMethod,
            notes: delivery.notes,
            lines: lines.map((l) => ({
              id: l.id,
              productId: l.productId,
              quantity: l.quantity,
              unitPurchaseNet: l.unitPurchaseNet,
              vatRate: l.vatRate,
              vatRecoverable: l.vatRecoverable,
            })),
          }}
        />
      ) : (
        <>
          <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Portes</p>
              <p className="font-medium">{formatEur(delivery.shippingCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Otros costes</p>
              <p className="font-medium">{formatEur(delivery.otherCosts)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">IVA recuperable (fuera coste)</p>
              <p className="font-medium">{formatEur(totalRecoverable)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Coste de adquisición total</p>
              <p className="font-display text-xl">{formatEur(totalLanded)}</p>
            </div>
          </section>

          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Precio de compra</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead>Portes/otros</TableHead>
                  <TableHead>Coste de adquisición</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link
                        href={`/productos/${l.productId}`}
                        className="font-medium hover:underline"
                      >
                        {l.productName}
                      </Link>
                      {l.productSku && (
                        <p className="text-xs text-muted-foreground">
                          {l.productSku}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{l.quantity}</TableCell>
                    <TableCell>{formatEur(l.unitPurchaseNet)}</TableCell>
                    <TableCell>
                      {l.vatRate}%{" "}
                      {l.vatRecoverable ? "(recuperable)" : "(no recuperable)"}
                      <p className="text-xs text-muted-foreground">
                        {formatEur(l.vatAmount)}
                      </p>
                    </TableCell>
                    <TableCell>{formatEur(l.allocatedOverhead)}</TableCell>
                    <TableCell className="font-medium">
                      {formatEur(l.landedUnitCost)} / ud
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Stock recibido mediante movimientos tipo «Entrada de stock» con
            clave de idempotencia por línea. El coste de adquisición del
            producto se actualiza por media ponderada.
          </p>
        </>
      )}
    </div>
  );
}
