"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  productId: number;
  productName: string;
  currentStock: number;
  movementCount: number;
  basketComponentCount: number;
  deliveryLineCount: number;
  assemblyLineCount: number;
  canDelete: boolean;
  blockers: string[];
  warnings: string[];
  returnTo: string;
};

/**
 * Spanish confirm UI + native form POST → /api/products/delete (303).
 * Failures reuse detail-page FlashMessage via ?error= (BA-25); do not add a
 * second flash channel on this page.
 */
export function DeleteProductButton({
  productId,
  productName,
  currentStock,
  movementCount,
  basketComponentCount,
  deliveryLineCount,
  assemblyLineCount,
  canDelete,
  blockers,
  warnings,
  returnTo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        Eliminar
      </Button>
    );
  }

  return (
    <div className="basis-full w-full max-w-lg space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <p className="font-medium text-destructive">Eliminar producto</p>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿Seguro que desea eliminar «{productName}»? Esta acción no se puede
          deshacer. (Archivar conserva el historial.)
        </p>
      </div>

      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>Existencias actuales: {currentStock}</li>
        <li>Movimientos: {movementCount}</li>
        {basketComponentCount > 0 && (
          <li>En recetas de cesta: {basketComponentCount}</li>
        )}
        {deliveryLineCount > 0 && (
          <li>Líneas de entrega: {deliveryLineCount}</li>
        )}
        {assemblyLineCount > 0 && (
          <li>Líneas de montaje: {assemblyLineCount}</li>
        )}
      </ul>

      {blockers.length > 0 && (
        <div className="space-y-1 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {blockers.map((b) => (
            <p key={b}>{b}</p>
          ))}
        </div>
      )}

      {canDelete && warnings.length > 0 && (
        <div className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canDelete ? (
          <form
            action="/api/products/delete"
            method="post"
            onSubmit={() => setPending(true)}
          >
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Eliminando…" : "Confirmar eliminación"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Resuelva los bloqueos anteriores o use Archivar.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
