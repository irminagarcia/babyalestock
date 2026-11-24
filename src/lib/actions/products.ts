"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { and, eq, like, or, sql, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
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
import { getPhotosDir, ensureDataDirs } from "@/lib/paths";
import { suggestProductSku } from "@/lib/product-sku";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseIntOr(value: FormDataEntryValue | null, fallback: number): number {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function allocateUniqueSku(
  db: ReturnType<typeof getDb>,
  attempts = 12,
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const candidate = suggestProductSku();
    const clash = await one(
      db.select({ id: products.id }).from(products).where(eq(products.sku, candidate)),
    );
    if (!clash) return candidate;
  }
  // Extremely unlikely; fold timestamp for uniqueness.
  return `BA-${Date.now().toString(36).toUpperCase()}`;
}

async function savePhoto(file: File | null, previous?: string | null) {
  if (!file || file.size === 0) return previous ?? null;
  ensureDataDirs();
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const dest = path.join(/*turbopackIgnore: true*/ getPhotosDir(), filename);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buf);
  if (previous) {
    const old = path.join(getPhotosDir(), previous);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  return filename;
}

export async function upsertProduct(formData: FormData) {
  const user = await requireUser();
  void user;
  const db = getDb();

  const idRaw = emptyToNull(formData.get("id"));
  const id = idRaw ? Number(idRaw) : null;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false as const, error: "El nombre del producto es obligatorio." };
  }

  let sku = emptyToNull(formData.get("sku"));
  // On create, auto-generate a unique SKU when the field is left blank.
  if (!id && !sku) {
    sku = await allocateUniqueSku(db);
  } else if (sku) {
    const clash = await one(
      db
        .select()
        .from(products)
        .where(
          id
            ? and(eq(products.sku, sku), ne(products.id, id))
            : eq(products.sku, sku),
        ),
    );
    if (clash) {
      return { ok: false as const, error: "Ya existe un producto con ese SKU." };
    }
  }

  const photo = formData.get("photo");
  const photoFile = photo instanceof File ? photo : null;

  const existing = id
    ? await one(db.select().from(products).where(eq(products.id, id)))
    : null;

  const photoPath = await savePhoto(photoFile, existing?.photoPath);

  const values = {
    name,
    sku,
    barcode: emptyToNull(formData.get("barcode")),
    categoryId: parseOptionalNumber(formData.get("categoryId")),
    subcategoryId: parseOptionalNumber(formData.get("subcategoryId")),
    brand: emptyToNull(formData.get("brand")),
    variant: emptyToNull(formData.get("variant")),
    size: emptyToNull(formData.get("size")),
    color: emptyToNull(formData.get("color")),
    supplierId: parseOptionalNumber(formData.get("supplierId")),
    purchaseCost: parseOptionalNumber(formData.get("purchaseCost")),
    sellingPrice: parseOptionalNumber(formData.get("sellingPrice")),
    minStock: parseIntOr(formData.get("minStock"), 0),
    storageLocation: emptyToNull(formData.get("storageLocation")),
    notes: emptyToNull(formData.get("notes")),
    usage: (emptyToNull(formData.get("usage")) ||
      "individual") as ProductUsage,
    status: (emptyToNull(formData.get("status")) || "active") as ProductStatus,
    photoPath,
    updatedAt: new Date().toISOString(),
  };

  // Initial stock only on create — later changes go through movements
  if (!id) {
    const initialStock = parseIntOr(formData.get("currentStock"), 0);
    const created = await one(
      db
        .insert(products)
        .values({ ...values, currentStock: Math.max(0, initialStock) })
        .returning(),
    );
    if (!created) {
      return { ok: false as const, error: "No se pudo crear el producto." };
    }
    revalidatePath("/productos");
    revalidatePath("/panel");
    return { ok: true as const, id: created.id };
  }

  await exec(db.update(products).set(values).where(eq(products.id, id)));
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  revalidatePath("/panel");
  return { ok: true as const, id };
}

export async function archiveProduct(productId: number) {
  await requireUser();
  await exec(
    getDb()
      .update(products)
      .set({ status: "archived", updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId)),
  );
  revalidatePath("/productos");
  revalidatePath("/panel");
  return { ok: true as const };
}

export async function restoreProduct(productId: number) {
  await requireUser();
  await exec(
    getDb()
      .update(products)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId)),
  );
  revalidatePath("/productos");
  revalidatePath("/panel");
  return { ok: true as const };
}

export type ProductFilters = {
  q?: string;
  categoryId?: string;
  brand?: string;
  stock?: string;
  usage?: string;
  status?: string;
};

export async function listProducts(filters: ProductFilters = {}) {
  await requireUser();
  const db = getDb();
  const conditions = [];

  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      or(
        like(products.name, q),
        like(products.sku, q),
        like(products.barcode, q),
        like(products.brand, q),
      ),
    );
  }
  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, Number(filters.categoryId)));
  }
  if (filters.brand) {
    conditions.push(eq(products.brand, filters.brand));
  }
  if (filters.usage) {
    conditions.push(eq(products.usage, filters.usage));
  }
  if (filters.status) {
    conditions.push(eq(products.status, filters.status));
  } else {
    conditions.push(ne(products.status, "archived"));
  }
  if (filters.stock === "low") {
    conditions.push(sql`${products.currentStock} <= ${products.minStock}`);
  } else if (filters.stock === "out") {
    conditions.push(eq(products.currentStock, 0));
  } else if (filters.stock === "in_stock") {
    conditions.push(sql`${products.currentStock} > 0`);
  }

  const rows = (await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      brand: products.brand,
      variant: products.variant,
      size: products.size,
      color: products.color,
      currentStock: products.currentStock,
      minStock: products.minStock,
      sellingPrice: products.sellingPrice,
      purchaseCost: products.purchaseCost,
      landedCost: products.landedCost,
      usage: products.usage,
      status: products.status,
      storageLocation: products.storageLocation,
      photoPath: products.photoPath,
      categoryName: categories.name,
      subcategoryName: subcategories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(conditions.length ? and(...conditions) : undefined)).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  return rows;
}
