"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Correct product stock from the edit page.
 * Posts to /api/products/correct-stock → 303 (Workers-safe),
 * which records a manual_correction movement with audit trail.
 */
export function StockCorrectionForm({
  productId,
  currentStock,
  returnTo,
  initialError,
  initialSuccess,
  disabled,
}: {
  productId: number;
  currentStock: number;
  returnTo: string;
  initialError?: string;
  initialSuccess?: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action="/api/products/correct-stock"
      method="post"
      className="space-y-4"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div>
        <h2 className="font-display text-xl">Corregir existencias</h2>
        <p className="text-sm text-muted-foreground">
          Si se equivocó al crear el producto o el conteo no cuadra, indique la
          cantidad correcta y el motivo. Se guarda como{" "}
          <span className="font-medium">corrección manual</span> en Movimientos
          (con usuario y fecha).
        </p>
      </div>

      {initialError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {initialError}
        </p>
      )}
      {initialSuccess && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {initialSuccess}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Existencias actuales</Label>
          <Input value={String(currentStock)} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newStock">Nueva cantidad *</Label>
          <Input
            id="newStock"
            name="newStock"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={currentStock}
            disabled={disabled || pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="reason">Motivo de la corrección *</Label>
          <Textarea
            id="reason"
            name="reason"
            rows={2}
            required
            placeholder="Ej. Error al dar de alta; conteo físico: 8 unidades"
            disabled={disabled || pending}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={disabled || pending}>
          {pending ? "Guardando…" : "Guardar corrección de stock"}
        </Button>
        <a
          href={`/movimientos?producto=${productId}&tipo=manual_correction`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Ir a Movimientos
        </a>
      </div>
    </form>
  );
}
