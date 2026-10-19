"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordMovement } from "@/lib/actions/movements";

type ProductOption = {
  id: number;
  name: string;
  sku: string | null;
  currentStock: number;
};

const types = [
  { value: "received", label: "Entrada de stock" },
  { value: "removed", label: "Salida de stock" },
  { value: "sale", label: "Venta" },
  { value: "damaged", label: "Dañado / merma" },
  { value: "return", label: "Devolución" },
  { value: "manual_correction", label: "Corrección manual (+/−)" },
];

export function MovementForm({
  products,
  defaultProductId,
  defaultType,
}: {
  products: ProductOption[];
  defaultProductId?: string;
  defaultType?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const keyField = useId();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await recordMovement(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.duplicate) {
        toast.message("Movimiento ya registrado (clave de idempotencia).");
      } else {
        toast.success(
          `Movimiento guardado. Existencias actuales: ${result.stockAfter}.`,
        );
      }
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
      form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <input
        type="hidden"
        name="idempotencyKey"
        id={keyField}
        value={idempotencyKey}
      />
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="productId">Producto *</Label>
        <select
          id="productId"
          name="productId"
          required
          defaultValue={defaultProductId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="" disabled>
            Seleccione un producto
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.sku ? ` (${p.sku})` : ""} — stock {p.currentStock}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de movimiento *</Label>
        <select
          id="type"
          name="type"
          required
          defaultValue={defaultType || "received"}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Cantidad *</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          required
          defaultValue={1}
        />
        <p className="text-xs text-muted-foreground">
          En corrección manual use positivo para sumar y negativo para restar.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="occurredAt">Fecha</Label>
        <Input
          id="occurredAt"
          name="occurredAt"
          type="datetime-local"
          defaultValue={new Date().toISOString().slice(0, 16)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="reason">Motivo / nota</Label>
        <Textarea id="reason" name="reason" rows={2} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || products.length === 0}>
          {pending ? "Guardando…" : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  );
}
