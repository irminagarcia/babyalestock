"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteBasketRecipe, setBasketStatus } from "@/lib/actions/baskets";

export function BasketStatusButtons({
  basketId,
  status,
}: {
  basketId: number;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setBasketStatus(basketId, "active");
              toast.success("Receta activada.");
              router.refresh();
            })
          }
        >
          Activar
        </Button>
      )}
      {status === "active" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setBasketStatus(basketId, "inactive");
              toast.success("Receta desactivada.");
              router.refresh();
            })
          }
        >
          Desactivar
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (
              !confirm(
                "¿Eliminar esta receta? No afecta al stock ni al historial de movimientos.",
              )
            ) {
              return;
            }
            await deleteBasketRecipe(basketId);
            toast.success("Receta eliminada.");
            router.push("/cestas");
            router.refresh();
          })
        }
      >
        Eliminar
      </Button>
    </div>
  );
}
