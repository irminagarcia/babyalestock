"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveProduct, restoreProduct } from "@/lib/actions/products";

export function ArchiveButtons({
  productId,
  status,
}: {
  productId: number;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status === "archived") {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await restoreProduct(productId);
            toast.success("Producto restaurado.");
            router.refresh();
          })
        }
      >
        Restaurar
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (
            !confirm(
              "¿Archivar este producto? Se ocultará del catálogo activo, pero se conservará el historial de movimientos.",
            )
          ) {
            return;
          }
          await archiveProduct(productId);
          toast.success("Producto archivado.");
          router.refresh();
        })
      }
    >
      Archivar
    </Button>
  );
}
