"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importProductsCsv } from "@/lib/actions/csv-import";
import { productCsvHeaders } from "@/lib/csv";

export function CsvPanel() {
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Exportar productos</h2>
        <p className="text-sm text-muted-foreground">
          Descarga el catálogo actual (incluye archivados) con cabeceras
          españolas.
        </p>
        <Button asChild>
          <a href="/api/csv/export">Descargar CSV</a>
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Importar productos</h2>
        <p className="text-sm text-muted-foreground">
          Si el CSV incluye <code>sku</code> y ya existe, se actualiza la ficha
          (las existencias solo se establecen al crear). Categorías, subcategorías
          y proveedores se crean automáticamente si faltan.
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await importProductsCsv(fd);
              if (!result.ok) {
                toast.error(result.error);
                setReport(null);
                return;
              }
              toast.success(
                `Importación terminada: ${result.created} creados, ${result.updated} actualizados.`,
              );
              setReport(
                result.errors.length
                  ? `Avisos:\n${result.errors.slice(0, 20).join("\n")}`
                  : "Sin errores.",
              );
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="file">Archivo CSV</Label>
            <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Importando…" : "Importar"}
          </Button>
        </form>
        {report && (
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {report}
          </pre>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 lg:col-span-2">
        <h2 className="font-display text-xl">Cabeceras esperadas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La primera fila debe contener estas columnas (el orden puede variar;
          <strong> nombre</strong> es obligatorio):
        </p>
        <code className="mt-3 block overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {productCsvHeaders.join(",")}
        </code>
        <p className="mt-3 text-sm text-muted-foreground">
          Valores útiles: uso = <code>individual</code> |{" "}
          <code>gift_component</code> | <code>both</code>; estado ={" "}
          <code>active</code> | <code>discontinued</code> | <code>archived</code>.
        </p>
      </section>
    </div>
  );
}
