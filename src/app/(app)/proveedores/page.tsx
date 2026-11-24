import { getDb } from "@/db/client";
import { ensureHostedSchema } from "@/db/ensure-hosted-schema";
import { suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { SupplierForm } from "./supplier-form";
import { Badge } from "@/components/ui/badge";

type SupplierRow = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  legalName: string | null;
  fiscalAddress: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
};

async function loadSuppliers(): Promise<SupplierRow[]> {
  try {
    await ensureHostedSchema();
  } catch {
    /* fall through to safe select */
  }

  const db = getDb();
  try {
    const rows = await db.select().from(suppliers);
    return rows
      .map((s) => ({
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        taxId: s.taxId ?? null,
        legalName: s.legalName ?? null,
        fiscalAddress: s.fiscalAddress ?? null,
        country: s.country ?? null,
        notes: s.notes,
        isActive: Boolean(s.isActive),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  } catch {
    // Neon without 002 yet: only columns that always exist.
    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        contactName: suppliers.contactName,
        email: suppliers.email,
        phone: suppliers.phone,
        notes: suppliers.notes,
        isActive: suppliers.isActive,
      })
      .from(suppliers);
    return rows
      .map((s) => ({
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        taxId: null,
        legalName: null,
        fiscalAddress: null,
        country: null,
        notes: s.notes,
        isActive: Boolean(s.isActive),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const rows = await loadSuppliers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Proveedores</h1>
        <p className="text-muted-foreground">
          Alta de proveedores con contacto, datos fiscales y país. Luego podrá
          asociarlos a productos y entradas.
        </p>
      </div>

      <SupplierForm initialError={query.error} initialOk={query.ok} />

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-muted/40 px-4 py-8 text-sm text-muted-foreground">
          No hay proveedores. Añada el primero con el formulario de arriba.
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
                <div>
                  <dt className="text-muted-foreground">NIF / CIF</dt>
                  <dd>{s.taxId || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Razón social</dt>
                  <dd>{s.legalName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dirección fiscal</dt>
                  <dd className="whitespace-pre-wrap">
                    {s.fiscalAddress || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">País</dt>
                  <dd>{s.country || "—"}</dd>
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
