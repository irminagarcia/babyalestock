"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmAssembly, previewAssembly } from "@/lib/actions/assembly";
import type { AssemblyPreview } from "@/lib/assembly";
import { formatEur, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BasketOption = {
  id: number;
  name: string;
  sku: string | null;
  sellingPrice: number | null;
  finishedStock: number;
  assemblyMode: string;
};

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `asm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AssembleForm({ baskets }: { baskets: BasketOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [basketId, setBasketId] = useState(
    baskets[0] ? String(baskets[0].id) : "",
  );
  const [quantity, setQuantity] = useState("1");
  const [mode, setMode] = useState<"preassembled" | "mto">("preassembled");
  const [notes, setNotes] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [preview, setPreview] = useState<AssemblyPreview | null>(null);

  const selected = useMemo(
    () => baskets.find((b) => String(b.id) === basketId),
    [baskets, basketId],
  );

  function runPreview() {
    startTransition(async () => {
      const result = await previewAssembly({
        basketId: Number(basketId),
        quantity: Math.floor(Number(quantity) || 0),
        assemblyMode: mode,
      });
      if (result.error && !result.preview) {
        toast.error(result.error);
        setPreview(null);
        return;
      }
      if (result.preview) {
        setPreview(result.preview);
        if (result.preview.errors.length) {
          toast.error(result.preview.errors[0]);
        } else if (result.preview.warnings.length) {
          toast.message(result.preview.warnings[0]);
        } else {
          toast.success("Vista previa lista.");
        }
      }
    });
  }

  function runConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("basketId", basketId);
      fd.set("quantity", quantity);
      fd.set("assemblyMode", mode);
      fd.set("notes", notes);
      fd.set("idempotencyKey", idempotencyKey);
      const result = await confirmAssembly({}, fd);
      if (result.error) {
        toast.error(result.error);
        if (result.preview) setPreview(result.preview);
        return;
      }
      toast.success(result.success || "Montaje registrado.");
      if (result.assemblyId) {
        router.push(`/montaje/${result.assemblyId}`);
        router.refresh();
      }
    });
  }

  if (baskets.length === 0) {
    return (
      <p className="rounded-xl border bg-muted/40 px-4 py-8 text-center text-sm">
        No hay recetas activas. Cree una en{" "}
        <a href="/cestas/nueva" className="underline">
          Cestas regalo
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="basketId">Receta</Label>
          <select
            id="basketId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={basketId}
            onChange={(e) => {
              setBasketId(e.target.value);
              setPreview(null);
            }}
          >
            {baskets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.sku ? ` (${b.sku})` : ""}
                {b.sellingPrice != null
                  ? ` · venta ${b.sellingPrice.toLocaleString("es-ES")} €`
                  : ""}
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-xs text-muted-foreground">
              Stock acabado actual: {formatNumber(selected.finishedStock)} uds.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad a montar</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setPreview(null);
            }}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Modo de montaje</Label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "preassembled"}
                onChange={() => {
                  setMode("preassembled");
                  setPreview(null);
                }}
              />
              Preensamblada (aumenta stock acabado)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "mto"}
                onChange={() => {
                  setMode("mto");
                  setPreview(null);
                }}
              />
              Bajo pedido (consume componentes, sin stock acabado)
            </label>
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="p. ej. pedido mostrador, lote semana…"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={runPreview}
        >
          {pending ? "Calculando…" : "Vista previa de consumo"}
        </Button>
        <Button
          type="button"
          disabled={pending || !preview?.canConfirm}
          onClick={runConfirm}
        >
          {pending ? "Confirmando…" : "Confirmar montaje"}
        </Button>
      </div>

      {preview && (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div>
            <h2 className="font-display text-xl">
              Vista previa — {preview.basketName} × {preview.quantity}
            </h2>
            <p className="text-sm text-muted-foreground">
              Coste unitario congelado {formatEur(preview.unitComponentCost)} ·
              coste total {formatEur(preview.totalComponentCost)}
              {preview.totalRevenue != null
                ? ` · venta total ${formatEur(preview.totalRevenue)}`
                : ""}
            </p>
          </div>

          {preview.errors.length > 0 && (
            <ul className="list-disc space-y-1 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {preview.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {preview.warnings.length > 0 && (
            <ul className="list-disc space-y-1 rounded-md border px-4 py-3 text-sm text-muted-foreground">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Por cesta</TableHead>
                <TableHead>Necesario</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Coste ud.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.components.map((c) => (
                <TableRow key={c.productId}>
                  <TableCell>
                    {c.productName}
                    {c.sku ? (
                      <span className="block text-xs text-muted-foreground">
                        {c.sku}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatNumber(c.recipeQtyPerUnit)}</TableCell>
                  <TableCell>{formatNumber(c.quantityNeeded)}</TableCell>
                  <TableCell>{formatNumber(c.currentStock)}</TableCell>
                  <TableCell>
                    {c.missingCost ? "—" : formatEur(c.unitLandedCost)}
                  </TableCell>
                  <TableCell>
                    {c.sufficient ? (
                      <span className="text-emerald-700">OK</span>
                    ) : (
                      <span className="text-destructive">
                        Faltan {c.shortfall}
                      </span>
                    )}
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
