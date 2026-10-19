"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  categories,
  products,
  subcategories,
  suppliers,
  type ProductStatus,
  type ProductUsage,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { mapCsvHeaders, parseCsv } from "@/lib/csv";

function cell(
  row: string[],
  map: Record<string, number>,
  key: string,
): string {
  const idx = map[key];
  if (idx === undefined) return "";
  return (row[idx] ?? "").trim();
}

function numOrNull(s: string): number | null {
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function ensureCategory(name: string | null) {
  if (!name) return null;
  const db = getDb();
  const existing = db
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .get();
  if (existing) return existing.id;
  return db.insert(categories).values({ name }).returning().get().id;
}

function ensureSubcategory(categoryId: number | null, name: string | null) {
  if (!categoryId || !name) return null;
  const db = getDb();
  const existing = db
    .select()
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId))
    .all()
    .find((s) => s.name === name);
  if (existing) return existing.id;
  return db
    .insert(subcategories)
    .values({ categoryId, name })
    .returning()
    .get().id;
}

function ensureSupplier(name: string | null) {
  if (!name) return null;
  const db = getDb();
  const existing = db
    .select()
    .from(suppliers)
    .where(eq(suppliers.name, name))
    .get();
  if (existing) return existing.id;
  return db.insert(suppliers).values({ name }).returning().get().id;
}

export async function importProductsCsv(formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Seleccione un archivo CSV." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return {
      ok: false as const,
      error: "El CSV está vacío o solo tiene cabeceras.",
    };
  }

  const map = mapCsvHeaders(rows[0]);
  if (map.nombre === undefined) {
    return {
      ok: false as const,
      error: 'Falta la columna obligatoria "nombre".',
    };
  }

  const db = getDb();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cell(row, map, "nombre");
    if (!name) {
      errors.push(`Fila ${i + 1}: nombre vacío.`);
      continue;
    }
    try {
      const categoryName = cell(row, map, "categoria") || null;
      const subcategoryName = cell(row, map, "subcategoria") || null;
      const supplierName = cell(row, map, "proveedor") || null;
      const categoryId = ensureCategory(categoryName);
      const subcategoryId = ensureSubcategory(categoryId, subcategoryName);
      const supplierId = ensureSupplier(supplierName);
      const sku = cell(row, map, "sku") || null;
      const usage = (cell(row, map, "uso") || "individual") as ProductUsage;
      const status = (cell(row, map, "estado") || "active") as ProductStatus;

      const values = {
        name,
        sku,
        barcode: cell(row, map, "codigo_barras") || null,
        categoryId,
        subcategoryId,
        brand: cell(row, map, "marca") || null,
        variant: cell(row, map, "variante") || null,
        size: cell(row, map, "talla") || null,
        color: cell(row, map, "color") || null,
        supplierId,
        purchaseCost: numOrNull(cell(row, map, "coste_compra")),
        sellingPrice: numOrNull(cell(row, map, "precio_venta")),
        minStock: numOrNull(cell(row, map, "stock_minimo")) ?? 0,
        storageLocation: cell(row, map, "ubicacion") || null,
        notes: cell(row, map, "notas") || null,
        usage,
        status,
        updatedAt: new Date().toISOString(),
      };

      const stock = numOrNull(cell(row, map, "existencias"));

      if (sku) {
        const existing = db
          .select()
          .from(products)
          .where(eq(products.sku, sku))
          .get();
        if (existing) {
          db.update(products).set(values).where(eq(products.id, existing.id)).run();
          updated++;
          continue;
        }
      }

      db.insert(products)
        .values({
          ...values,
          currentStock: Math.max(0, stock ?? 0),
        })
        .run();
      created++;
    } catch (err) {
      errors.push(
        `Fila ${i + 1}: ${err instanceof Error ? err.message : "error"}`,
      );
    }
  }

  revalidatePath("/productos");
  revalidatePath("/panel");
  revalidatePath("/categorias");
  revalidatePath("/proveedores");

  return {
    ok: true as const,
    created,
    updated,
    errors,
  };
}
