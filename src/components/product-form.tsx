"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestProductSku } from "@/lib/product-sku";

type Option = { id: number; name: string };
type SubOption = { id: number; name: string; categoryId: number };

export type ProductFormValues = {
  id?: number;
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  brand?: string | null;
  variant?: string | null;
  size?: string | null;
  color?: string | null;
  supplierId?: number | null;
  purchaseCost?: number | null;
  sellingPrice?: number | null;
  currentStock?: number;
  minStock?: number;
  storageLocation?: string | null;
  notes?: string | null;
  usage?: string;
  status?: string;
  photoPath?: string | null;
};

export function ProductForm({
  initial,
  categories,
  subcategories,
  suppliers,
  returnTo,
  initialError,
}: {
  initial?: ProductFormValues;
  categories: Option[];
  subcategories: SubOption[];
  suppliers: Option[];
  /** Path to return to on validation error (Workers 303). */
  returnTo: string;
  initialError?: string;
}) {
  const isCreate = !initial?.id;
  const [pending, setPending] = useState(false);
  const [sku, setSku] = useState(
    () => initial?.sku ?? (isCreate ? suggestProductSku() : ""),
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ? String(initial.categoryId) : "",
  );

  const filteredSubs = useMemo(
    () =>
      subcategories.filter((s) =>
        categoryId ? s.categoryId === Number(categoryId) : false,
      ),
    [subcategories, categoryId],
  );

  const cancelHref = initial?.id
    ? `/productos/${initial.id}`
    : "/productos";

  return (
    <form
      action="/api/products/upsert"
      method="post"
      encType="multipart/form-data"
      className="space-y-6"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      {initialError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {initialError}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Body manga larga algodón"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <div className="flex gap-2">
            <Input
              id="sku"
              name="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="BA-XXXXXX"
              autoComplete="off"
            />
            {isCreate && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setSku(suggestProductSku())}
              >
                Nuevo
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isCreate
              ? "Se genera automáticamente un SKU único; puede editarlo o pulsar Nuevo."
              : "Puede cambiar el SKU; debe seguir siendo único."}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Código de barras</Label>
          <Input
            id="barcode"
            name="barcode"
            defaultValue={initial?.barcode ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <select
            id="categoryId"
            name="categoryId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— Sin categoría —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subcategoryId">Subcategoría</Label>
          <select
            id="subcategoryId"
            name="subcategoryId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            defaultValue={initial?.subcategoryId ?? ""}
          >
            <option value="">— Sin subcategoría —</option>
            {filteredSubs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="variant">Variante</Label>
          <Input
            id="variant"
            name="variant"
            defaultValue={initial?.variant ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="size">Talla</Label>
          <Input id="size" name="size" defaultValue={initial?.size ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" defaultValue={initial?.color ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Proveedor</Label>
          <select
            id="supplierId"
            name="supplierId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            defaultValue={initial?.supplierId ?? ""}
          >
            <option value="">— Sin proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="usage">Uso del producto</Label>
          <select
            id="usage"
            name="usage"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            defaultValue={initial?.usage ?? "individual"}
          >
            <option value="individual">Venta individual</option>
            <option value="gift_component">Componente de cesta</option>
            <option value="both">Ambos usos</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            name="status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">Activo</option>
            <option value="discontinued">Descatalogado</option>
            <option value="archived">Archivado</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseCost">Precio de compra (EUR)</Label>
          <Input
            id="purchaseCost"
            name="purchaseCost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.purchaseCost ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Neto de referencia. Las entregas de proveedor actualizan este valor
            y el coste de adquisición (media ponderada).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Precio de venta (EUR)</Label>
          <Input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.sellingPrice ?? ""}
          />
        </div>
        {!initial?.id && (
          <div className="space-y-2">
            <Label htmlFor="currentStock">Existencias iniciales</Label>
            <Input
              id="currentStock"
              name="currentStock"
              type="number"
              min="0"
              defaultValue={initial?.currentStock ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              Si se equivoca, podrá corregir existencias en Editar producto
              (queda registrado en Movimientos) o usar Entradas / Salidas.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="minStock">Stock mínimo</Label>
          <Input
            id="minStock"
            name="minStock"
            type="number"
            min="0"
            defaultValue={initial?.minStock ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="storageLocation">Ubicación de almacén</Label>
          <Input
            id="storageLocation"
            name="storageLocation"
            defaultValue={initial?.storageLocation ?? ""}
            placeholder="Estantería A2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photo">Foto</Label>
          <Input id="photo" name="photo" type="file" accept="image/*" />
          {initial?.photoPath && (
            <p className="text-xs text-muted-foreground">
              Foto actual guardada. Elija un archivo para reemplazarla.
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={initial?.notes ?? ""}
            rows={3}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} asChild>
          <a href={cancelHref}>Cancelar</a>
        </Button>
      </div>
    </form>
  );
}
