"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  confirmDelivery,
  deleteDraftDelivery,
} from "@/lib/actions/deliveries";

export function ConfirmDeliveryButtons({ deliveryId }: { deliveryId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (
              !confirm(
                "¿Confirmar esta entrega? Se recibirá el stock y se actualizará el coste de adquisición (media ponderada). Esta acción no se puede deshacer desde el borrador.",
              )
            ) {
              return;
            }
            const result = await confirmDelivery(deliveryId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(result.success || "Entrega confirmada.");
            router.refresh();
          })
        }
      >
        {pending ? "Confirmando…" : "Confirmar entrega"}
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!confirm("¿Eliminar este borrador?")) return;
            const result = await deleteDraftDelivery(deliveryId);
            if ("error" in result && result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Borrador eliminado.");
            router.push("/entregas");
            router.refresh();
          })
        }
      >
        Eliminar borrador
      </Button>
    </div>
  );
}
