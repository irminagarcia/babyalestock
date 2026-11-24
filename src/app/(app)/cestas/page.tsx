import Link from "next/link";
import { listBasketRecipes } from "@/lib/actions/baskets";
import { formatEur } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlashMessage } from "@/components/flash-message";
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

export default async function BasketsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const query = await searchParams;
  const rows = await listBasketRecipes();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Cestas regalo</h1>
          <p className="text-muted-foreground">
            Recetas reutilizables con coste estimado a partir del coste de
            adquisición de cada componente. Sin descuento de stock al editar.
          </p>
        </div>
        <Button asChild>
          <Link href="/cestas/nueva">Nueva receta</Link>
        </Button>
      </div>

      <FlashMessage error={query.error} ok={query.ok} />

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center">
          <p className="font-medium">Todavía no hay recetas de cesta.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cree una receta con productos (y embalaje) para ver beneficio y
            margen estimados.
          </p>
          <Button asChild className="mt-4">
            <Link href="/cestas/nueva">Nueva receta</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cesta</TableHead>
                <TableHead>Componentes</TableHead>
                <TableHead>Coste estimado</TableHead>
                <TableHead>P. venta</TableHead>
                <TableHead>Beneficio est.</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/cestas/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU {r.sku}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{r.componentCount}</TableCell>
                  <TableCell>
                    {formatEur(r.totalComponentCost)}
                    {r.missingCostCount > 0 && (
                      <p className="text-xs text-amber-800">
                        {r.missingCostCount} sin coste
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.sellingPrice != null ? formatEur(r.sellingPrice) : "—"}
                  </TableCell>
                  <TableCell>
                    {r.estimatedProfit != null
                      ? formatEur(r.estimatedProfit)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.estimatedMarginPct != null
                      ? `${r.estimatedMarginPct.toLocaleString("es-ES", {
                          maximumFractionDigits: 1,
                        })} %`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "active"
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
