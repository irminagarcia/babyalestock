import type { MovementType, ProductStatus, ProductUsage } from "@/db/schema";

export const usageLabels: Record<ProductUsage, string> = {
  individual: "Venta individual",
  gift_component: "Componente de cesta",
  both: "Ambos usos",
};

export const statusLabels: Record<ProductStatus, string> = {
  active: "Activo",
  discontinued: "Descatalogado",
  archived: "Archivado",
};

export const movementTypeLabels: Record<MovementType, string> = {
  received: "Entrada de stock",
  removed: "Salida de stock",
  sale: "Venta",
  damaged: "Dañado / merma",
  return: "Devolución",
  manual_correction: "Corrección manual",
};

/** Signed delta applied to current_stock for each movement type. */
export function movementDelta(
  type: MovementType,
  quantity: number,
): number {
  const abs = Math.abs(quantity);
  switch (type) {
    case "received":
    case "return":
      return abs;
    case "removed":
    case "sale":
    case "damaged":
      return -abs;
    case "manual_correction":
      // quantity is the signed adjustment (+/-)
      return quantity;
    default:
      return 0;
  }
}

export const stockStatusLabels = {
  all: "Todos",
  in_stock: "Con existencias",
  low: "Stock bajo",
  out: "Sin stock",
} as const;
