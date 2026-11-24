"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "idle" | "edit" | "delete";

type Props = {
  categoryId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
  subcategoryCount: number;
  canDelete: boolean;
  blockers: string[];
  warnings: string[];
};

/**
 * Spanish edit/delete UI for one category.
 * Native form POST → 303 (Workers-safe; same pattern as product delete).
 */
export function CategoryManage({
  categoryId,
  name,
  description,
  isActive,
  productCount,
  subcategoryCount,
  canDelete,
  blockers,
  warnings,
}: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [pending, setPending] = useState(false);

  if (mode === "idle") {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode("edit")}
        >
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => setMode("delete")}
        >
          Eliminar
        </Button>
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <form
        action="/api/categories/update"
        method="post"
        className="mt-4 space-y-3 rounded-xl border bg-muted/30 p-4"
        onSubmit={(e) => {
          if (!e.currentTarget.checkValidity()) return;
          setPending(true);
        }}
      >
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="returnTo" value="/categorias" />
        <p className="font-medium">Editar categoría</p>
        <div className="space-y-2">
          <Label htmlFor={`cat-edit-name-${categoryId}`}>Nombre</Label>
          <Input
            id={`cat-edit-name-${categoryId}`}
            name="name"
            required
            defaultValue={name}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cat-edit-desc-${categoryId}`}>Descripción</Label>
          <Input
            id={`cat-edit-desc-${categoryId}`}
            name="description"
            defaultValue={description ?? ""}
            disabled={pending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            value="on"
            defaultChecked={isActive}
            disabled={pending}
            className="size-4 rounded border border-input"
          />
          Categoría activa
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setMode("idle")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <p className="font-medium text-destructive">Eliminar categoría</p>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿Seguro que desea eliminar «{name}»? Esta acción no se puede
          deshacer.
        </p>
      </div>

      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>Productos vinculados: {productCount}</li>
        <li>Subcategorías: {subcategoryCount}</li>
      </ul>

      {blockers.length > 0 && (
        <div className="space-y-1 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {blockers.map((b) => (
            <p key={b}>{b}</p>
          ))}
        </div>
      )}

      {canDelete && warnings.length > 0 && (
        <div className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canDelete ? (
          <form
            action="/api/categories/delete"
            method="post"
            // Native document POST → API 303 (Workers-safe; no soft nav).
            onSubmit={() => setPending(true)}
          >
            <input type="hidden" name="categoryId" value={categoryId} />
            <input type="hidden" name="returnTo" value="/categorias" />
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending ? "Eliminando…" : "Confirmar eliminación"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Reasigne o elimine los productos vinculados antes de borrar.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setMode("idle")}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
