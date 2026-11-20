import Link from "next/link";
import { ne, desc, eq } from "drizzle-orm";
import { AlertTriangle, Package, Boxes, ShoppingBasket } from "lucide-react";
import { getDb } from "@/db/client";
import { products, stockMovements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { movementTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export default async function PanelPage() {
  await requireUser();
  const db = getDb();

  const activeProducts = await db
    .select()
    .from(products)
    .where(ne(products.status, "archived"));

  const totalProducts = activeProducts.length;
  const totalUnits = activeProducts.reduce((sum, p) => sum + p.currentStock, 0);
  const lowStock = activeProducts
    .filter((p) => p.currentStock <= p.minStock)
    .sort((a, b) => a.currentStock - b.currentStock);

  const recent = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      occurredAt: stockMovements.occurredAt,
      productName: products.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .orderBy(desc(stockMovements.occurredAt))
    .limit(8);

  const stats = [
    {
      label: "Productos activos",
      value: formatNumber(totalProducts),
      icon: Package,
      hint: "Catálogo no archivado",
    },
    {
      label: "Existencias totales",
      value: formatNumber(totalUnits),
      icon: Boxes,
      hint: "Unidades en tienda",
    },
    {
      label: "Stock bajo",
      value: formatNumber(lowStock.length),
      icon: AlertTriangle,
      hint: "En o por debajo del mínimo",
    },
    {
      label: "Para reponer",
      value: formatNumber(lowStock.filter((p) => p.currentStock === 0).length),
      icon: ShoppingBasket,
      hint: "Sin existencias",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Panel</h1>
        <p className="mt-1 text-muted-foreground">
          Resumen de existencias y alertas de reposición.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="animate-fade-up">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Alertas de stock bajo</CardTitle>
              <CardDescription>Lista de reposición prioritaria</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/productos?stock=low">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="rounded-md bg-emerald-50 px-3 py-4 text-sm text-emerald-900">
                No hay alertas: todos los productos activos están por encima del
                mínimo.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Existencias</TableHead>
                    <TableHead>Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/productos/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU {p.sku}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.currentStock === 0 ? "destructive" : "warning"}
                        >
                          {formatNumber(p.currentStock)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(p.minStock)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimos movimientos</CardTitle>
              <CardDescription>Historial reciente de existencias</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/movimientos">Historial</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
                Aún no hay movimientos. Registre una entrada o salida de stock.
              </p>
            ) : (
              <ul className="space-y-3">
                {recent.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{m.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {movementTypeLabels[m.type as keyof typeof movementTypeLabels] ||
                          m.type}{" "}
                        · {formatDate(m.occurredAt)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {m.quantity > 0 &&
                      (m.type === "received" || m.type === "return")
                        ? "+"
                        : m.type === "manual_correction" && m.quantity > 0
                          ? "+"
                          : m.type === "manual_correction"
                            ? ""
                            : "−"}
                      {formatNumber(Math.abs(m.quantity))}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/productos/nuevo">Añadir producto</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/entregas/nueva">Entrada de proveedor</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/cestas/nueva">Nueva cesta regalo</Link>
        </Button>
      </div>
    </div>
  );
}
