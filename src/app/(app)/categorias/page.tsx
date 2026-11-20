import { getDb } from "@/db/client";
import { categories, subcategories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CategoryForms } from "./category-forms";
import { Badge } from "@/components/ui/badge";

export default async function CategoriesPage() {
  await requireUser();
  const db = getDb();
  const cats = (await db.select().from(categories)).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const subs = await db.select().from(subcategories);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Categorías</h1>
        <p className="text-muted-foreground">
          Categorías y subcategorías dinámicas para organizar el catálogo.
        </p>
      </div>

      <CategoryForms
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {cats.length === 0 ? (
          <p className="rounded-xl border bg-muted/40 px-4 py-8 text-sm text-muted-foreground md:col-span-2">
            No hay categorías todavía. Cree la primera arriba.
          </p>
        ) : (
          cats.map((cat) => {
            const children = subs
              .filter((s) => s.categoryId === cat.id)
              .sort((a, b) => a.name.localeCompare(b.name, "es"));
            return (
              <article
                key={cat.id}
                className="rounded-xl border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl">{cat.name}</h2>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={cat.isActive ? "success" : "secondary"}>
                    {cat.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <ul className="mt-4 space-y-1 text-sm">
                  {children.length === 0 ? (
                    <li className="text-muted-foreground">
                      Sin subcategorías
                    </li>
                  ) : (
                    children.map((s) => (
                      <li key={s.id} className="flex justify-between border-b py-1">
                        <span>{s.name}</span>
                        {!s.isActive && (
                          <span className="text-xs text-muted-foreground">
                            inactiva
                          </span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
