"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CancelAssemblyButton({ assemblyId }: { assemblyId: number }) {
  const [pending, setPending] = useState(false);
  const returnTo = `/montaje/${assemblyId}`;

  return (
    <form
      action="/api/assemblies/cancel"
      method="post"
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Anular este montaje? Se devolverán los componentes al stock con movimientos compensatorios y se excluirá de Rentabilidad → Registrado.",
          )
        ) {
          e.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input type="hidden" name="assemblyId" value={assemblyId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Anulando…" : "Anular montaje"}
      </Button>
    </form>
  );
}
