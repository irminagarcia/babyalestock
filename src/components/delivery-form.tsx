"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveDraftDelivery,
  type DeliveryFormState,
} from "@/lib/actions/deliveries";
import { computeDeliveryCosts } from "@/lib/landed-cost";
import { formatEur } from "@/lib/utils";

type Option = { id: number; name: string; sku?: string | null };

type LineState = {
  key: string;
  productId: string;
  quantity: string;
  unitPurchaseNet: string;
  vatRate: string;
  vatRecoverable: boolean;
};

const initialState: DeliveryFormState = {};

function newLine(): LineState {
  return {
    key: crypto.randomUUID(),
    productId: "",
    quantity: "1",
    unitPurchaseNet: "",
    vatRate: "21",
    vatRecoverable: true,
  };
}

export function DeliveryForm({
  suppliers,
  products,
  initial,
}: {
  suppliers: Option[];
  products: Option[];
  initial?: {
    id: number;
    supplierId: number;
    deliveryDate: string;
    reference: string | null;
    shippingCost: number;
    otherCosts: number;
    allocationMethod: string;
    notes: string | null;
    lines: {
      id?: number;
      productId: number;
      quantity: number;
      unitPurchaseNet: number;
      vatRate: number;
      vatRecoverable: boolean;
    }[];
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveDraftDelivery,
    initialState,
  );
  const [lines, setLines] = useState<LineState[]>(() =>
    initial?.lines?.length
      ? initial.lines.map((l) => ({
          key: String(l.id ?? crypto.randomUUID()),
          productId: String(l.productId),
          quantity: String(l.quantity),
          unitPurchaseNet: String(l.unitPurchaseNet),
          vatRate: String(l.vatRate),
          vatRecoverable: l.vatRecoverable,
        }))
      : [newLine()],
  );
  const [shippingCost, setShippingCost] = useState(
    String(initial?.shippingCost ?? 0),
  );
  const [otherCosts, setOtherCosts] = useState(String(initial?.otherCosts ?? 0));
  const [allocationMethod, setAllocationMethod] = useState(
    initial?.allocationMethod || "by_net_value",
  );

  const preview = useMemo(() => {
    const parsed = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({
        key: l.key,
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        unitPurchaseNet: Number(String(l.unitPurchaseNet).replace(",", ".")),
        vatRate: Number(String(l.vatRate).replace(",", ".")) || 0,
        vatRecoverable: l.vatRecoverable,
      }));
    return computeDeliveryCosts(
      {
        shippingCost: Number(String(shippingCost).replace(",", ".")) || 0,
        otherCosts: Number(String(otherCosts).replace(",", ".")) || 0,
        allocationMethod:
          allocationMethod === "by_quantity" ? "by_quantity" : "by_net_value",
      },
      parsed,
    );
  }, [lines, shippingCost, otherCosts, allocationMethod]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success && state.deliveryId) {
      toast.success(state.success);
      router.push(`/entregas/${state.deliveryId}`);
      router.refresh();
    }
  }, [state, router]);

  const linesJson = JSON.stringify(
    lines.map((l) => ({
      key: l.key,
      productId: Number(l.productId),
      quantity: Number(l.quantity),
      unitPurchaseNet: Number(String(l.unitPurchaseNet).replace(",", ".")),
      vatRate: Number(String(l.vatRate).replace(",", ".")) || 0,
      vatRecoverable: l.vatRecoverable,
    })),
  );

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="linesJson" value={linesJson} />

      <section className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <h2 className="font-display text-xl md:col-span-2">
          Cabecera de entrega
        </h2>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Proveedor *</Label>
          <select
            id="supplierId"
            name="supplierId"
            required
            defaultValue={initial?.supplierId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Seleccione…
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Fecha *</Label>
          <Input
            id="deliveryDate"
            name="deliveryDate"
            type="date"
            required
            defaultValue={
              initial?.deliveryDate?.slice(0, 10) ||
              new Date().toISOString().slice(0, 10)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Referencia / albarán</Label>
          <Input
            id="reference"
            name="reference"
            defaultValue={initial?.reference ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allocationMethod">Reparto de portes y otros *</Label>
          <select
            id="allocationMethod"
            name="allocationMethod"
            value={allocationMethod}
            onChange={(e) => setAllocationMethod(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="by_net_value">Por valor neto de línea (predeterminado)</option>
            <option value="by_quantity">Por cantidad</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Los portes no se aplican igual a cada producto: se reparte de forma
            proporcional según el método elegido.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shippingCost">Portes (EUR)</Label>
          <Input
            id="shippingCost"
            name="shippingCost"
            type="number"
            step="0.01"
            min="0"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otherCosts">Otros costes de adquisición (EUR)</Label>
          <Input
            id="otherCosts"
            name="otherCosts"
            type="number"
            step="0.01"
            min="0"
            value={otherCosts}
            onChange={(e) => setOtherCosts(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
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
          <h2 className="font-display text-xl">Líneas de producto</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            Añadir línea
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Precio de compra</strong> = neto unitario. El{" "}
          <strong>IVA recuperable</strong> se registra pero{" "}
          <em>no</em> entra en el coste de adquisición. El IVA no recuperable sí.
        </p>

        <div className="space-y-4">
          {lines.map((line, index) => {
            const computed = preview.lines.find((c) => c.key === line.key);
            return (
              <div
                key={line.key}
                className="grid gap-3 rounded-lg border bg-background/60 p-3 md:grid-cols-6"
              >
                <div className="space-y-1 md:col-span-2">
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
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sku ? ` (${p.sku})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <Label>Precio de compra *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={line.unitPurchaseNet}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index
                            ? { ...l, unitPurchaseNet: e.target.value }
                            : l,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>IVA %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.vatRate}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, vatRate: e.target.value } : l,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tratamiento IVA</Label>
                  <select
                    value={line.vatRecoverable ? "1" : "0"}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index
                            ? { ...l, vatRecoverable: e.target.value === "1" }
                            : l,
                        ),
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    <option value="1">Recuperable (fuera del coste)</option>
                    <option value="0">No recuperable (entra en coste)</option>
                  </select>
                </div>
                <div className="md:col-span-5 text-xs text-muted-foreground">
                  {computed ? (
                    <>
                      Neto línea {formatEur(computed.lineNet)} · Portes/otros
                      asignados {formatEur(computed.allocatedOverhead)} · IVA{" "}
                      {formatEur(computed.vatAmount)} ·{" "}
                      <strong>
                        Coste de adquisición unitario{" "}
                        {formatEur(computed.landedUnitCost)}
                      </strong>
                    </>
                  ) : (
                    "Complete cantidad y precio para ver el coste de adquisición."
                  )}
                </div>
                <div className="flex items-end md:justify-end">
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
        <h2 className="font-display text-xl">Vista previa de costes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimación operativa — no es un asiento contable ni un modelo fiscal
          oficial.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Neto mercancías</dt>
            <dd className="font-medium">{formatEur(preview.totals.lineNet)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Portes + otros (reparto)</dt>
            <dd className="font-medium">{formatEur(preview.totals.overhead)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">IVA recuperable (fuera coste)</dt>
            <dd className="font-medium">
              {formatEur(preview.totals.recoverableVat)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total coste de adquisición</dt>
            <dd className="font-display text-lg">
              {formatEur(preview.totals.landedTotal)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar borrador"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/entregas")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
