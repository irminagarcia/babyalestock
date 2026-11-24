"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ArchiveButtons({
  productId,
  status,
}: {
  productId: number;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const returnTo = `/productos/${productId}`;

  if (status === "archived") {
    return (
      <form
        action="/api/products/restore"
        method="post"
        onSubmit={() => setPending(true)}
      >
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button variant="outline" type="submit" disabled={pending}>
          {pending ? "Restaurando…" : "Restaurar"}
        </Button>
      </form>
    );
  }

  return (
    <form
      action="/api/products/archive"
      method="post"
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Archivar este producto? Se ocultará del catálogo activo, pero se conservará el historial de movimientos.",
          )
        ) {
          e.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Archivando…" : "Archivar"}
      </Button>
    </form>
  );
}
