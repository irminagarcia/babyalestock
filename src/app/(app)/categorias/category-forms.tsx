"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlashMessage } from "@/components/flash-message";

export function CategoryForms({
  categories,
  initialError,
  initialOk,
}: {
  categories: { id: number; name: string }[];
  initialError?: string;
  initialOk?: string;
}) {
  const [pendingCat, setPendingCat] = useState(false);
  const [pendingSub, setPendingSub] = useState(false);

  return (
    <div className="space-y-4">
      <FlashMessage error={initialError} ok={initialOk} />
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          action="/api/categories/create"
          method="post"
          className="space-y-3 rounded-xl border bg-card p-5"
          onSubmit={(e) => {
            if (!e.currentTarget.checkValidity()) return;
            setPendingCat(true);
          }}
        >
          <input type="hidden" name="returnTo" value="/categorias" />
          <h2 className="font-display text-lg">Nueva categoría</h2>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input id="cat-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Descripción</Label>
            <Input id="cat-desc" name="description" />
          </div>
          <Button type="submit" disabled={pendingCat}>
            {pendingCat ? "Guardando…" : "Guardar"}
          </Button>
        </form>

        <form
          action="/api/subcategories/create"
          method="post"
          className="space-y-3 rounded-xl border bg-card p-5"
          onSubmit={(e) => {
            if (!e.currentTarget.checkValidity()) return;
            setPendingSub(true);
          }}
        >
          <input type="hidden" name="returnTo" value="/categorias" />
          <h2 className="font-display text-lg">Nueva subcategoría</h2>
          <div className="space-y-2">
            <Label htmlFor="sub-cat">Categoría padre</Label>
            <select
              id="sub-cat"
              name="categoryId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Seleccione…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-name">Nombre</Label>
            <Input id="sub-name" name="name" required />
          </div>
          <Button
            type="submit"
            disabled={pendingSub || categories.length === 0}
          >
            {pendingSub ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
