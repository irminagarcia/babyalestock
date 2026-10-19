"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategory,
  createSubcategory,
} from "@/lib/actions/taxonomy";

export function CategoryForms({
  categories,
}: {
  categories: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        className="space-y-3 rounded-xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await createCategory(fd);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Categoría creada.");
            e.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-lg">Nueva categoría</h2>
        <div className="space-y-2">
          <Label htmlFor="cat-name">Nombre</Label>
          <Input id="cat-name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-desc">Descripción</Label>
          <Input id="cat-desc" name="description" />
        </div>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </form>

      <form
        className="space-y-3 rounded-xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await createSubcategory(fd);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Subcategoría creada.");
            e.currentTarget.reset();
            router.refresh();
          });
        }}
      >
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
        <Button type="submit" disabled={pending || categories.length === 0}>
          Guardar
        </Button>
      </form>
    </div>
  );
}
