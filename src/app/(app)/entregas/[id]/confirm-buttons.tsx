"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDeliveryButtons({ deliveryId }: { deliveryId: number }) {
  const [pending, setPending] = useState(false);
  const returnTo = `/entregas/${deliveryId}`;

  return (
    <div className="flex flex-wrap gap-2">
      <form
        action="/api/deliveries/confirm"
        method="post"
        onSubmit={(e) => {
          if (
            !confirm(
              "¿Confirmar esta entrega? Se recibirá el stock y se actualizará el coste de adquisición (media ponderada). Esta acción no se puede deshacer desde el borrador.",
            )
          ) {
            e.preventDefault();
            return;
          }
          setPending(true);
        }}
      >
        <input type="hidden" name="deliveryId" value={deliveryId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit" disabled={pending}>
          {pending ? "Confirmando…" : "Confirmar entrega"}
        </Button>
      </form>
      <form
        action="/api/deliveries/delete"
        method="post"
        onSubmit={(e) => {
          if (!confirm("¿Eliminar este borrador?")) {
            e.preventDefault();
            return;
          }
          setPending(true);
        }}
      >
        <input type="hidden" name="deliveryId" value={deliveryId} />
        <Button variant="outline" type="submit" disabled={pending}>
          Eliminar borrador
        </Button>
      </form>
    </div>
  );
}
