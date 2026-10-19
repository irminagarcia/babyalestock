"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelAssembly } from "@/lib/actions/assembly";
import { Button } from "@/components/ui/button";

export function CancelAssemblyButton({ assemblyId }: { assemblyId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (
            !confirm(
              "¿Anular este montaje? Se devolverán los componentes al stock con movimientos compensatorios y se excluirá de Rentabilidad → Registrado.",
            )
          ) {
            return;
          }
          const result = await cancelAssembly(assemblyId);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result.success || "Montaje anulado.");
          router.refresh();
        })
      }
    >
      {pending ? "Anulando…" : "Anular montaje"}
    </Button>
  );
}
