import { ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products } from "@/db/schema";
import { listMovements } from "@/lib/actions/movements";
import { requireUser } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/utils";
import { movementTypeLabels } from "@/lib/labels";
import { MovementForm } from "@/components/movement-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; tipo?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const db = getDb();
  const productOptions = (
    await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
      })
      .from(products)
      .where(ne(products.status, "archived"))
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));

  const history = await listMovements(150);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Movimientos</h1>
        <p className="text-muted-foreground">
          Entradas de stock, salidas, ventas, mermas, devoluciones y
          correcciones. Cada registro queda en el historial con usuario y fecha.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Registrar movimiento</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          La clave de idempotencia evita descontar dos veces si pulsa Guardar
          dos veces por error.
        </p>
        {productOptions.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-4 text-sm">
            No hay productos activos. Cree un producto antes de registrar
            movimientos.
          </p>
        ) : (
          <MovementForm
            products={productOptions}
            defaultProductId={params.producto}
            defaultType={params.tipo}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Historial de movimientos</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay movimientos registrados.
          </p>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.occurredAt)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{m.productName}</p>
                      {m.productSku && (
                        <p className="text-xs text-muted-foreground">
                          {m.productSku}
                        </p>
                      )}
                    </TableCell>
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
