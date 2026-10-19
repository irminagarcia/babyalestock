import Link from "next/link";
import { Suspense } from "react";
import { getProfitabilityOverview } from "@/lib/actions/profitability";
import { formatEur, formatNumber } from "@/lib/utils";
import { usageLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodFilter } from "./period-filter";

function NatureBadge({ nature }: { nature: "estimado" | "registrado" }) {
  return (
    <Badge variant={nature === "registrado" ? "success" : "secondary"}>
      {nature === "registrado" ? "Registrado" : "Estimado"}
    </Badge>
  );
}

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
}

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const data = await getProfitabilityOverview({
    from: sp.from,
    to: sp.to,
    basketStatus: sp.estado || "active",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Rentabilidad</h1>
        <p className="text-muted-foreground">
          Informe operativo de Baby Ale — no es un P&amp;L contable. Los valores{" "}
          <strong>Estimado</strong> usan costes de adquisición y recetas
          actuales; <strong>Registrado</strong> solo aparece cuando hay montajes
          o ventas de cesta guardados.
        </p>
      </div>

      <Suspense fallback={<div className="text-sm">Cargando filtros…</div>}>
        <PeriodFilter
          defaultFrom={sp.from}
          defaultTo={sp.to}
          defaultStatus={sp.estado || "active"}
        />
      </Suspense>

      {/* Estimado portfolio */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl">Cartera de cestas</h2>
          <NatureBadge nature="estimado" />
        </div>
        <p className="text-sm text-muted-foreground">
          Totales = una unidad de cada receta del filtro (cartera), no unidades
          vendidas en el periodo.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recetas en vista</CardDescription>
              <CardTitle className="font-display text-3xl">
                {formatNumber(data.portfolio.basketCount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Coste estimado total</CardDescription>
              <CardTitle className="font-display text-3xl">
                {formatEur(data.portfolio.cost)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Venta estimada (cartera)</CardDescription>
              <CardTitle className="font-display text-3xl">
                {formatEur(data.portfolio.revenue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Beneficio / margen estimados</CardDescription>
              <CardTitle className="font-display text-3xl">
                {formatEur(data.portfolio.profit)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Margen {pct(data.portfolio.marginPct)}
            </CardContent>
          </Card>
        </div>

        {data.basketRows.length === 0 ? (
          <p className="rounded-xl border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No hay recetas con este filtro.{" "}
            <Link href="/cestas/nueva" className="underline">
              Crear una cesta
            </Link>
            .
          </p>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cesta</TableHead>
                  <TableHead>Naturaleza</TableHead>
                  <TableHead>Coste est.</TableHead>
                  <TableHead>P. venta</TableHead>
                  <TableHead>Beneficio est.</TableHead>
                  <TableHead>Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.basketRows.map((r) => (
                  <TableRow key={r.basketId}>
                    <TableCell>
                      <Link
                        href={`/cestas/${r.basketId}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.componentCount} comp.
                        {r.sku ? ` · ${r.sku}` : ""}
                        {r.missingCostCount > 0
                          ? ` · ${r.missingCostCount} sin coste`
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <NatureBadge nature="estimado" />
                    </TableCell>
                    <TableCell>{formatEur(r.estimatedCost)}</TableCell>
                    <TableCell>
                      {r.sellingPrice != null ? formatEur(r.sellingPrice) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.estimatedProfit != null
                        ? formatEur(r.estimatedProfit)
                        : "—"}
                    </TableCell>
                    <TableCell>{pct(r.estimatedMarginPct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Registrado period */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl">Vendido / montado en el periodo</h2>
          <NatureBadge nature="registrado" />
        </div>
        <p className="text-sm text-muted-foreground">
          Totales reales del periodo a partir de montajes{" "}
          <Link href="/montaje" className="underline">
            registrados
          </Link>{" "}
          (no anulados), con coste e ingreso congelados al confirmar. Editar la
          receta después no cambia estas cifras.
        </p>

        {!data.hasRecordedBasketSales ? (
          <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-sm">
            <p className="font-medium">
              No hay montajes de cesta <em>registrados</em> en este periodo.
            </p>
            <p className="mt-2 text-muted-foreground">
              Vaya a{" "}
              <Link href="/montaje/nuevo" className="underline">
                Montar cestas
              </Link>{" "}
              para registrar unidades. La cartera <strong>Estimado</strong>{" "}
              arriba sigue mostrando la rentabilidad teórica de las recetas.
              Movimientos de venta de producto suelto en el periodo:{" "}
              <strong>
                {formatNumber(data.productSalesInPeriod.movementCount)}
              </strong>{" "}
              (
              {formatNumber(data.productSalesInPeriod.units)} uds.) — no están
              ligados a cestas.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Unidades registradas</CardDescription>
                  <CardTitle className="font-display text-3xl">
                    {formatNumber(data.recordedTotals.units)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Coste registrado</CardDescription>
                  <CardTitle className="font-display text-3xl">
                    {formatEur(data.recordedTotals.cost)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Venta registrada</CardDescription>
                  <CardTitle className="font-display text-3xl">
                    {formatEur(data.recordedTotals.revenue)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Beneficio / margen registrados</CardDescription>
                  <CardTitle className="font-display text-3xl">
                    {formatEur(data.recordedTotals.profit)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Margen {pct(data.recordedTotals.marginPct)}
                </CardContent>
              </Card>
            </div>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cesta</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Coste</TableHead>
                    <TableHead>Venta</TableHead>
                    <TableHead>Beneficio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recordedRows.map((r) => (
                    <TableRow key={r.assemblyId}>
                      <TableCell>{r.assembledAt.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/montaje/${r.assemblyId}`}
                          className="hover:underline"
                        >
                          {r.basketName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <NatureBadge nature="registrado" />
                      </TableCell>
                      <TableCell>{formatNumber(r.quantity)}</TableCell>
                      <TableCell>{formatEur(r.costSnapshot)}</TableCell>
                      <TableCell>{formatEur(r.revenueSnapshot)}</TableCell>
                      <TableCell>{formatEur(r.profit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {/* Product breakdown */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl">Desglose de productos</h2>
          <NatureBadge nature="estimado" />
        </div>
        <p className="text-sm text-muted-foreground">
          Beneficio unitario estimado = precio de venta − coste de adquisición
          (o precio de compra si aún no hay coste de adquisición).
        </p>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>P. compra</TableHead>
                <TableHead>Coste adq.</TableHead>
                <TableHead>P. venta</TableHead>
                <TableHead>Benef. ud.</TableHead>
                <TableHead>Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.productRows.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell>
                    <Link
                      href={`/productos/${p.productId}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Stock {formatNumber(p.currentStock)}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    {usageLabels[p.usage as keyof typeof usageLabels] || p.usage}
                  </TableCell>
                  <TableCell>
                    {p.purchaseCost != null ? formatEur(p.purchaseCost) : "—"}
                  </TableCell>
                  <TableCell>
                    {p.landedCost != null ? formatEur(p.landedCost) : "—"}
                  </TableCell>
                  <TableCell>
                    {p.sellingPrice != null ? formatEur(p.sellingPrice) : "—"}
                  </TableCell>
                  <TableCell>
                    {p.unitEstimatedProfit != null
                      ? formatEur(p.unitEstimatedProfit)
                      : "—"}
                  </TableCell>
                  <TableCell>{pct(p.unitEstimatedMarginPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Basket cost breakdown links */}
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl">Desglose de cestas</h2>
        <p className="text-sm text-muted-foreground">
          Abra cada receta para ver el coste estimado por componente (siempre{" "}
          <NatureBadge nature="estimado" />).
        </p>
        <ul className="flex flex-wrap gap-2">
          {data.basketRows.map((r) => (
            <li key={r.basketId}>
              <Link
                href={`/cestas/${r.basketId}`}
                className="inline-flex rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
              >
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
