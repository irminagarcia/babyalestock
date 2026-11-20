import { getDb } from "@/db/client";
import { suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { SupplierForm } from "./supplier-form";
import { Badge } from "@/components/ui/badge";

export default async function SuppliersPage() {
  await requireUser();
  const rows = (
    await getDb().select().from(suppliers)
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Proveedores</h1>
        <p className="text-muted-foreground">
          Directorio básico para asociar productos. Ampliable en hitos
          posteriores.
        </p>
      </div>

      <SupplierForm />

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-muted/40 px-4 py-8 text-sm text-muted-foreground">
          No hay proveedores. Añada el primero con el formulario.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((s) => (
            <article key={s.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl">{s.name}</h2>
                <Badge variant={s.isActive ? "success" : "secondary"}>
                  {s.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div>
                  <dt className="text-muted-foreground">Contacto</dt>
                  <dd>{s.contactName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{s.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Teléfono</dt>
                  <dd>{s.phone || "—"}</dd>
                </div>
                {s.notes && (
                  <div>
                    <dt className="text-muted-foreground">Notas</dt>
                    <dd>{s.notes}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
