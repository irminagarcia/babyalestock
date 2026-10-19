"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PeriodFilter({
  defaultFrom,
  defaultTo,
  defaultStatus,
}: {
  defaultFrom?: string | null;
  defaultTo?: string | null;
  defaultStatus?: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const next = new URLSearchParams(params.toString());
        for (const key of ["from", "to", "estado"]) {
          const v = String(fd.get(key) || "").trim();
          if (v) next.set(key, v);
          else next.delete(key);
        }
        startTransition(() => {
          router.push(`/rentabilidad?${next.toString()}`);
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="from">Desde (periodo registrado)</Label>
        <Input
          id="from"
          name="from"
          type="date"
          defaultValue={defaultFrom ?? ""}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to">Hasta</Label>
        <Input id="to" name="to" type="date" defaultValue={defaultTo ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="estado">Recetas (estimado)</Label>
        <select
          id="estado"
          name="estado"
          defaultValue={defaultStatus || "active"}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="active">Solo activas</option>
          <option value="all">Todas</option>
          <option value="inactive">Inactivas</option>
          <option value="draft">Borradores</option>
        </select>
      </div>
      <div className="flex items-end gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>
          Aplicar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/rentabilidad")}
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}
