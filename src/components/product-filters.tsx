"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Option = { id: number; name: string };

export function ProductFilters({
  categories,
  brands,
}: {
  categories: Option[];
  brands: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(form: HTMLFormElement) {
    const fd = new FormData(form);
    const next = new URLSearchParams();
    for (const [key, value] of fd.entries()) {
      const v = String(value).trim();
      if (v) next.set(key, v);
    }
    startTransition(() => {
      router.push(`/productos?${next.toString()}`);
    });
  }

  return (
    <form
      className="grid gap-3 rounded-xl border bg-card/80 p-4 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      <Input
        name="q"
        placeholder="Buscar nombre, SKU, marca…"
        defaultValue={params.get("q") ?? ""}
        className="md:col-span-2"
      />
      <select
        name="categoryId"
        defaultValue={params.get("categoryId") ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="">Categoría</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        name="brand"
        defaultValue={params.get("brand") ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="">Marca</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <select
        name="stock"
        defaultValue={params.get("stock") ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="">Estado de stock</option>
        <option value="in_stock">Con existencias</option>
        <option value="low">Stock bajo</option>
        <option value="out">Sin stock</option>
      </select>
      <select
        name="usage"
        defaultValue={params.get("usage") ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="">Uso</option>
        <option value="individual">Venta individual</option>
        <option value="gift_component">Componente de cesta</option>
        <option value="both">Ambos usos</option>
      </select>
      <select
        name="status"
        defaultValue={params.get("status") ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm md:col-span-2"
      >
        <option value="">Activos y descatalogados</option>
        <option value="active">Solo activos</option>
        <option value="discontinued">Descatalogados</option>
        <option value="archived">Archivados</option>
      </select>
      <div className="flex gap-2 md:col-span-4 md:justify-end">
        <Button type="submit" disabled={pending}>
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/productos")}
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}
