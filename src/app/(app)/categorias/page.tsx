import { getDb } from "@/db/client";
import { categories, subcategories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assessCategoryDelete } from "@/lib/actions/taxonomy";
import { CategoryForms } from "./category-forms";
import { CategoryManage } from "./category-manage";
import { Badge } from "@/components/ui/badge";
import { FlashMessage } from "@/components/flash-message";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const db = getDb();
  const cats = (await db.select().from(categories)).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const subs = await db.select().from(subcategories);

  const assessments = await Promise.all(
    cats.map(async (cat) => {
      const result = await assessCategoryDelete(cat.id);
      if (!result.ok) {
        return {
          categoryId: cat.id,
          productCount: 0,
          subcategoryCount: 0,
          canDelete: false,
          blockers: [result.error],
          warnings: [] as string[],
        };
      }
      return {
        categoryId: result.categoryId,
        productCount: result.productCount,
        subcategoryCount: result.subcategoryCount,
        canDelete: result.canDelete,
        blockers: result.blockers,
        warnings: result.warnings,
      };
    }),
  );
  const assessmentById = new Map(
    assessments.map((a) => [a.categoryId, a] as const),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Categorías</h1>
        <p className="text-muted-foreground">
          Categorías y subcategorías dinámicas para organizar el catálogo.
        </p>
      </div>

      <FlashMessage error={query.error} ok={query.ok} />

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
            const assessment = assessmentById.get(cat.id);
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
                {assessment && (
                  <CategoryManage
                    categoryId={cat.id}
                    name={cat.name}
                    description={cat.description}
                    isActive={cat.isActive}
                    productCount={assessment.productCount}
                    subcategoryCount={assessment.subcategoryCount}
                    canDelete={assessment.canDelete}
                    blockers={assessment.blockers}
                    warnings={assessment.warnings}
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
