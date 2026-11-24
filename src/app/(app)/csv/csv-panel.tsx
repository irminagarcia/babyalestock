"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlashMessage } from "@/components/flash-message";
import { productCsvHeaders } from "@/lib/csv";

export function CsvPanel({
  initialError,
  initialOk,
  initialReport,
}: {
  initialError?: string;
  initialOk?: string;
  initialReport?: string;
}) {
  const [pending, setPending] = useState(false);

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
          Si el CSV incluye <code>sku</code> y ya existe, se actualiza la ficha.
          Por defecto las existencias solo se establecen al crear. Active la
          casilla de inventariar para fijar también el stock al coincidir por
          SKU. Categorías, subcategorías y proveedores se crean si faltan.
        </p>
        <FlashMessage error={initialError} ok={initialOk} />
        <form
          action="/api/csv/import"
          method="post"
          encType="multipart/form-data"
          className="space-y-3"
          onSubmit={(e) => {
            if (!e.currentTarget.checkValidity()) return;
            setPending(true);
          }}
        >
          <input type="hidden" name="returnTo" value="/csv" />
          <div className="space-y-2">
            <Label htmlFor="file">Archivo CSV</Label>
            <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="updateStockOnMatch"
              value="1"
              className="mt-1"
            />
            <span>
              <strong>Inventariar:</strong> al coincidir por SKU, actualizar
              también la columna <code>existencias</code> (útil para carga
              inicial masiva).
            </span>
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Importando…" : "Importar"}
          </Button>
        </form>
        {initialReport && (
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {initialReport}
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
