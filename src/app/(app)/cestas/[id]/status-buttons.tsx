"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BasketStatusButtons({
  basketId,
  status,
}: {
  basketId: number;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const returnTo = `/cestas/${basketId}`;

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" && (
        <form
          action="/api/baskets/status"
          method="post"
          onSubmit={() => setPending(true)}
        >
          <input type="hidden" name="basketId" value={basketId} />
          <input type="hidden" name="status" value="active" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button variant="secondary" size="sm" type="submit" disabled={pending}>
            Activar
          </Button>
        </form>
      )}
      {status === "active" && (
        <form
          action="/api/baskets/status"
          method="post"
          onSubmit={() => setPending(true)}
        >
          <input type="hidden" name="basketId" value={basketId} />
          <input type="hidden" name="status" value="inactive" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button variant="outline" size="sm" type="submit" disabled={pending}>
            Desactivar
          </Button>
        </form>
      )}
      <form
        action="/api/baskets/delete"
        method="post"
        onSubmit={(e) => {
          if (
            !confirm(
              "¿Eliminar esta receta? No afecta al stock ni al historial de movimientos.",
            )
          ) {
            e.preventDefault();
            return;
          }
          setPending(true);
        }}
      >
        <input type="hidden" name="basketId" value={basketId} />
        <Button variant="outline" size="sm" type="submit" disabled={pending}>
          Eliminar
        </Button>
      </form>
    </div>
  );
}
