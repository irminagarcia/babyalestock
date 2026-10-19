import Link from "next/link";
import { Suspense } from "react";
import { eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, products } from "@/db/schema";
import { listProducts } from "@/lib/actions/products";
import { formatEur, formatNumber } from "@/lib/utils";
import { statusLabels, usageLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "@/components/product-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const rows = await listProducts(filters);
  const db = getDb();
  const cats = db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const brands = [
    ...new Set(
      db
        .select({ brand: products.brand })
        .from(products)
        .where(ne(products.status, "archived"))
        .all()
        .map((r) => r.brand)
        .filter((b): b is string => Boolean(b)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Productos</h1>
          <p className="text-muted-foreground">
            Catálogo dinámico de la boutique. {formatNumber(rows.length)}{" "}
            resultados.
          </p>
        </div>
        <Button asChild>
          <Link href="/productos/nuevo">Añadir producto</Link>
        </Button>
      </div>

      <Suspense fallback={<div className="text-sm">Cargando filtros…</div>}>
        <ProductFilters categories={cats} brands={brands} />
      </Suspense>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center">
          <p className="font-medium">No hay productos con estos filtros.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pruebe a limpiar los filtros o añada un producto nuevo.
          </p>
          <Button asChild className="mt-4">
            <Link href="/productos/nuevo">Añadir producto</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Existencias</TableHead>
                <TableHead>P. venta</TableHead>
                <TableHead>Coste adq.</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const low = p.currentStock <= p.minStock;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/productos/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {[p.sku && `SKU ${p.sku}`, p.brand, p.size, p.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell>
                      {p.categoryName || "—"}
                      {p.subcategoryName && (
                        <p className="text-xs text-muted-foreground">
                          {p.subcategoryName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.currentStock === 0
                            ? "destructive"
                            : low
                              ? "warning"
                              : "success"
                        }
                      >
                        {formatNumber(p.currentStock)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        mín. {formatNumber(p.minStock)}
                      </p>
                    </TableCell>
                    <TableCell>{formatEur(p.sellingPrice)}</TableCell>
                    <TableCell>
                      {formatEur(p.landedCost ?? p.purchaseCost)}
                    </TableCell>
                    <TableCell>
                      {usageLabels[p.usage as keyof typeof usageLabels] ||
                        p.usage}
                    </TableCell>
                    <TableCell>
                      {statusLabels[p.status as keyof typeof statusLabels] ||
                        p.status}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
