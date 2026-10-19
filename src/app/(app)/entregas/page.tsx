import Link from "next/link";
import { listDeliveries } from "@/lib/actions/deliveries";
import { formatEur, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const allocLabel: Record<string, string> = {
  by_net_value: "Por valor neto",
  by_quantity: "Por cantidad",
};

export default async function DeliveriesPage() {
  const rows = await listDeliveries();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Entradas de proveedor</h1>
          <p className="text-muted-foreground">
            Entregas con portes repartidos y coste de adquisición (estimación
            operativa).
          </p>
        </div>
        <Button asChild>
          <Link href="/entregas/nueva">Nueva entrega</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center">
          <p className="font-medium">Aún no hay entregas.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre una entrada de proveedor para calcular el coste de
            adquisición y recibir stock.
          </p>
          <Button asChild className="mt-4">
            <Link href="/entregas/nueva">Nueva entrega</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Portes + otros</TableHead>
                <TableHead>Reparto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/entregas/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.deliveryDate.slice(0, 10)}
                    </Link>
                    {r.confirmedAt && (
                      <p className="text-xs text-muted-foreground">
                        Conf. {formatDate(r.confirmedAt)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{r.supplierName}</TableCell>
                  <TableCell>{r.reference || "—"}</TableCell>
                  <TableCell>
                    {formatEur((r.shippingCost || 0) + (r.otherCosts || 0))}
                  </TableCell>
                  <TableCell>
                    {allocLabel[r.allocationMethod] || r.allocationMethod}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "confirmed"
                          ? "success"
                          : r.status === "draft"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {statusLabel[r.status] || r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
