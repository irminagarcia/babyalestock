"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exec, one } from "@/db/query";
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

async function ensureCategory(name: string | null) {
  if (!name) return null;
  const db = getDb();
  const existing = await one(
    db.select().from(categories).where(eq(categories.name, name)),
  );
  if (existing) return existing.id;
  const created = await one(db.insert(categories).values({ name }).returning());
  return created!.id;
}

async function ensureSubcategory(categoryId: number | null, name: string | null) {
  if (!categoryId || !name) return null;
  const db = getDb();
  const existingRows = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId));
  const existing = existingRows.find((s) => s.name === name);
  if (existing) return existing.id;
  const created = await one(
    db.insert(subcategories).values({ categoryId, name }).returning(),
  );
  return created!.id;
}

async function ensureSupplier(name: string | null) {
  if (!name) return null;
  const db = getDb();
  const existing = await one(
    db.select().from(suppliers).where(eq(suppliers.name, name)),
  );
  if (existing) return existing.id;
  const created = await one(db.insert(suppliers).values({ name }).returning());
  return created!.id;
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

  const updateStockOnMatch =
    formData.get("updateStockOnMatch") === "1" ||
    formData.get("updateStockOnMatch") === "on" ||
    formData.get("updateStockOnMatch") === "true";

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
      const categoryId = await ensureCategory(categoryName);
      const subcategoryId = await ensureSubcategory(categoryId, subcategoryName);
      const supplierId = await ensureSupplier(supplierName);
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
        const existing = await one(
          db.select().from(products).where(eq(products.sku, sku)),
        );
        if (existing) {
          const patch =
            updateStockOnMatch && stock !== null
              ? { ...values, currentStock: Math.max(0, stock) }
              : values;
          await exec(
            db.update(products).set(patch).where(eq(products.id, existing.id)),
          );
          updated++;
          continue;
        }
      }

      await exec(
        db.insert(products).values({
          ...values,
          currentStock: Math.max(0, stock ?? 0),
        }),
      );
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