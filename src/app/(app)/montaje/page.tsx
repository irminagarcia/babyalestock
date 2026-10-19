import Link from "next/link";
import { listAssemblies } from "@/lib/actions/assembly";
import { formatDate, formatEur, formatNumber } from "@/lib/utils";
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

const modeLabel: Record<string, string> = {
  preassembled: "Preensamblada",
  mto: "Bajo pedido",
};

export default async function MontajePage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const sp = await searchParams;
  const estado = sp.estado || "all";
  const rows = await listAssemblies({
    status: estado === "all" ? "all" : estado,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Montaje de cestas</h1>
          <p className="text-muted-foreground">
            Ensamble unidades a partir de una receta: se descuenta el stock de
            componentes, se congelan costes e ingresos, y el resultado alimenta{" "}
            <Link href="/rentabilidad" className="underline">
              Rentabilidad → Registrado
            </Link>
            .
          </p>
        </div>
        <Button asChild>
          <Link href="/montaje/nuevo">Montar cestas</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { key: "all", label: "Todos" },
          { key: "recorded", label: "Registrados" },
          { key: "cancelled", label: "Anulados" },
        ].map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/montaje" : `/montaje?estado=${f.key}`}
            className={`rounded-md border px-3 py-1.5 ${
              estado === f.key
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center">
          <p className="font-medium">Aún no hay montajes registrados.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Elija una receta activa y confirme el montaje cuando haya stock
            suficiente de todos los componentes.
          </p>
          <Button asChild className="mt-4">
            <Link href="/montaje/nuevo">Montar cestas</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Receta</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead>Coste ud.</TableHead>
                <TableHead>P. venta</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.assembledAt)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/montaje/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.recipeNameSnapshot || r.basketName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      #{r.id}
                      {r.notes ? ` · ${r.notes.slice(0, 40)}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    {modeLabel[r.assemblyMode] || r.assemblyMode}
                  </TableCell>
                  <TableCell>{formatNumber(r.quantity)}</TableCell>
                  <TableCell>
                    {r.totalComponentCostSnapshot != null
                      ? formatEur(r.totalComponentCostSnapshot)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.sellingPriceSnapshot != null
                      ? formatEur(r.sellingPriceSnapshot)
                      : "—"}
                  </TableCell>
                  <TableCell>{r.userName || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "cancelled" ? "secondary" : "success"
                      }
                    >
                      {r.status === "cancelled" ? "Anulado" : "Registrado"}
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
