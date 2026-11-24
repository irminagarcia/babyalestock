"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FlashMessage } from "@/components/flash-message";
import { estimateBasketCost, resolveUnitCost } from "@/lib/basket-cost";
import { formatEur } from "@/lib/utils";
import { usageLabels } from "@/lib/labels";

type ProductOption = {
  id: number;
  name: string;
  sku: string | null;
  usage: string;
  landedCost: number | null;
  purchaseCost: number | null;
  currentStock: number;
};

type LineState = {
  key: string;
  productId: string;
  quantity: string;
};

function newLine(): LineState {
  return { key: crypto.randomUUID(), productId: "", quantity: "1" };
}

export function BasketForm({
  products,
  initial,
  returnTo,
  initialError,
}: {
  products: ProductOption[];
  initial?: {
    id: number;
    name: string;
    sku: string | null;
    description: string | null;
    sellingPrice: number | null;
    notes: string | null;
    status: string;
    components: { productId: number; quantity: number }[];
  };
  returnTo: string;
  initialError?: string;
}) {
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<LineState[]>(() =>
    initial?.components?.length
      ? initial.components.map((c) => ({
          key: crypto.randomUUID(),
          productId: String(c.productId),
          quantity: String(c.quantity),
        }))
      : [newLine()],
  );
  const [sellingPrice, setSellingPrice] = useState(
    initial?.sellingPrice != null ? String(initial.sellingPrice) : "",
  );

  const byId = useMemo(() => {
    const m = new Map<number, ProductOption>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const preview = useMemo(() => {
    const comps = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => {
        const p = byId.get(Number(l.productId));
        const { unit, missing } = resolveUnitCost(
          p?.landedCost,
          p?.purchaseCost,
        );
        return {
          key: l.key,
          productId: Number(l.productId),
          productName: p?.name,
          quantity: Number(l.quantity),
          unitLandedCost: missing ? null : unit,
          missingCost: missing,
        };
      });
    const sell = sellingPrice
      ? Number(String(sellingPrice).replace(",", "."))
      : null;
    return estimateBasketCost(comps, sell);
  }, [lines, sellingPrice, byId]);

  const componentsJson = JSON.stringify(
    lines.map((l) => ({
      productId: Number(l.productId),
      quantity: Number(l.quantity),
    })),
  );

  const cancelHref = initial?.id ? `/cestas/${initial.id}` : "/cestas";

  return (
    <form
      action="/api/baskets/upsert"
      method="post"
      className="space-y-6"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="componentsJson" value={componentsJson} />

      <FlashMessage error={initialError} />

      <section className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <h2 className="font-display text-xl md:col-span-2">Datos de la receta</h2>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Cesta bienvenida bebé"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={initial?.sku ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "active"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
            <option value="draft">Borrador</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Precio de venta (EUR)</Label>
          <Input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            step="0.01"
            min="0"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas internas</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ""}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">Componentes</h2>
            <p className="text-sm text-muted-foreground">
              Incluya productos y presentación/embalaje. El coste estimado usa el{" "}
              <strong>coste de adquisición</strong> de cada ítem (no se descuenta
              stock al guardar).
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            Añadir componente
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const p = byId.get(Number(line.productId));
            const { unit, missing } = resolveUnitCost(
              p?.landedCost,
              p?.purchaseCost,
            );
            const est = preview.lines.find((c) => c.key === line.key);
            return (
              <div
                key={line.key}
                className="grid gap-3 rounded-lg border bg-background/60 p-3 md:grid-cols-12"
              >
                <div className="space-y-1 md:col-span-6">
                  <Label>Producto *</Label>
                  <select
                    required
                    value={line.productId}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, productId: e.target.value } : l,
                        ),
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    <option value="">Seleccione…</option>
                    {products.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                        {opt.sku ? ` (${opt.sku})` : ""} ·{" "}
                        {usageLabels[opt.usage as keyof typeof usageLabels] ||
                          opt.usage}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Cantidad *</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, quantity: e.target.value } : l,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-3 text-sm">
                  <Label>Coste de adquisición</Label>
                  <p className="pt-2 font-medium">
                    {p
                      ? missing
                        ? "Sin coste — 0,00 €"
                        : `${formatEur(unit)} / ud`
                      : "—"}
                  </p>
                  {est && (
                    <p className="text-xs text-muted-foreground">
                      Línea {formatEur(est.lineCost)}
                    </p>
                  )}
                </div>
                <div className="flex items-end md:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl">Estimación de rentabilidad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cálculo operativo en vivo. Editar la receta no altera movimientos ni
          entregas históricas. El congelado de costes llegará con el montaje de
          cestas (aún no disponible).
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Coste estimado componentes</dt>
            <dd className="font-display text-lg">
              {formatEur(preview.totalComponentCost)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Precio de venta</dt>
            <dd className="font-medium">
              {preview.sellingPrice != null
                ? formatEur(preview.sellingPrice)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Beneficio estimado</dt>
            <dd className="font-medium">
              {preview.estimatedProfit != null
                ? formatEur(preview.estimatedProfit)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Margen estimado</dt>
            <dd className="font-medium">
              {preview.estimatedMarginPct != null
                ? `${preview.estimatedMarginPct.toLocaleString("es-ES", {
                    maximumFractionDigits: 1,
                  })} %`
                : "—"}
            </dd>
          </div>
        </dl>
        {preview.missingCostCount > 0 && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {preview.missingCostCount} componente(s) sin coste de adquisición ni
            precio de compra: contribuyen 0 € a la estimación.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar receta"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} asChild>
          <a href={cancelHref}>Cancelar</a>
        </Button>
      </div>
    </form>
  );
}
