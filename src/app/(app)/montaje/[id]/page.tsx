import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssemblyDetail } from "@/lib/actions/assembly";
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
import { CancelAssemblyButton } from "./cancel-button";

const modeLabel: Record<string, string> = {
  preassembled: "Preensamblada",
  mto: "Bajo pedido",
};

export default async function AssemblyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const detail = await getAssemblyDetail(id);
  if (!detail) notFound();

  const { assembly, lines, cancelledByName } = detail;
  const unitCost = assembly.totalComponentCostSnapshot ?? 0;
  const unitSell = assembly.sellingPriceSnapshot;
  const totalCost = unitCost * assembly.quantity;
  const totalSell =
    unitSell != null ? unitSell * assembly.quantity : null;
  const profit =
    totalSell != null ? totalSell - totalCost : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/montaje" className="underline">
              Montaje
            </Link>{" "}
            · #{assembly.id}
          </p>
          <h1 className="font-display text-3xl">
            {assembly.recipeNameSnapshot || assembly.basketName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {formatDate(assembly.assembledAt)} ·{" "}
            {modeLabel[assembly.assemblyMode] || assembly.assemblyMode} ·{" "}
            {formatNumber(assembly.quantity)} ud(s)
            {assembly.userName ? ` · ${assembly.userName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={assembly.status === "cancelled" ? "secondary" : "success"}
          >
            {assembly.status === "cancelled" ? "Anulado" : "Registrado"}
          </Badge>
          {assembly.status === "recorded" && (
            <CancelAssemblyButton assemblyId={assembly.id} />
          )}
          <Button asChild variant="outline">
            <Link href={`/cestas/${assembly.basketId}`}>Ver receta</Link>
          </Button>
        </div>
      </div>

      {assembly.status === "cancelled" && (
        <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          Anulado el {formatDate(assembly.cancelledAt)}
          {cancelledByName ? ` por ${cancelledByName}` : ""}. Excluido de
          Rentabilidad → Registrado. Los costes congelados se conservan.
        </p>
      )}

      {assembly.notes && (
        <p className="text-sm text-muted-foreground">Notas: {assembly.notes}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Coste ud. congelado</p>
          <p className="font-display text-2xl">{formatEur(unitCost)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">P. venta congelado</p>
          <p className="font-display text-2xl">
            {unitSell != null ? formatEur(unitSell) : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Coste total</p>
          <p className="font-display text-2xl">{formatEur(totalCost)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Beneficio total</p>
          <p className="font-display text-2xl">
            {profit != null ? formatEur(profit) : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-display text-xl">Componentes consumidos</h2>
          <p className="text-sm text-muted-foreground">
            Instantánea al montar — editar la receta no cambia estas líneas.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Por cesta</TableHead>
              <TableHead>Consumido</TableHead>
              <TableHead>Coste ud.</TableHead>
              <TableHead>Coste línea</TableHead>
              <TableHead>Movimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link
                    href={`/productos/${l.productId}`}
                    className="hover:underline"
                  >
                    {l.productName}
                  </Link>
                  {l.productSku && (
                    <p className="text-xs text-muted-foreground">
                      {l.productSku}
                    </p>
                  )}
                </TableCell>
                <TableCell>{formatNumber(l.recipeQtyPerUnit)}</TableCell>
                <TableCell>{formatNumber(l.quantity)}</TableCell>
                <TableCell>{formatEur(l.unitLandedCostSnapshot)}</TableCell>
                <TableCell>{formatEur(l.lineCostSnapshot)}</TableCell>
                <TableCell>
                  {l.stockMovementId != null ? `#${l.stockMovementId}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
