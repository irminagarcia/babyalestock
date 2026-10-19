"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function createCategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) return { ok: false as const, error: "El nombre es obligatorio." };
  try {
    getDb().insert(categories).values({ name, description }).run();
  } catch {
    return { ok: false as const, error: "Ya existe una categoría con ese nombre." };
  }
  revalidatePath("/categorias");
  revalidatePath("/productos");
  return { ok: true as const };
}

export async function createSubcategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  const categoryId = Number(formData.get("categoryId"));
  if (!name || !Number.isFinite(categoryId)) {
    return { ok: false as const, error: "Indique categoría y nombre." };
  }
  try {
    getDb().insert(subcategories).values({ name, categoryId }).run();
  } catch {
    return {
      ok: false as const,
      error: "Ya existe esa subcategoría en la categoría.",
    };
  }
  revalidatePath("/categorias");
  revalidatePath("/productos");
  return { ok: true as const };
}

export async function createSupplier(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false as const, error: "El nombre es obligatorio." };
  try {
    getDb()
      .insert(suppliers)
      .values({
        name,
        contactName: String(formData.get("contactName") || "").trim() || null,
        email: String(formData.get("email") || "").trim() || null,
        phone: String(formData.get("phone") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null,
      })
      .run();
  } catch {
    return { ok: false as const, error: "Ya existe un proveedor con ese nombre." };
  }
  revalidatePath("/proveedores");
  revalidatePath("/productos");
  return { ok: true as const };
}

export async function toggleCategory(id: number, isActive: boolean) {
  await requireUser();
  getDb()
    .update(categories)
    .set({ isActive })
    .where(eq(categories.id, id))
    .run();
  revalidatePath("/categorias");
  return { ok: true as const };
}

export async function toggleSupplier(id: number, isActive: boolean) {
  await requireUser();
  getDb()
    .update(suppliers)
    .set({ isActive })
    .where(eq(suppliers.id, id))
    .run();
  revalidatePath("/proveedores");
  return { ok: true as const };
}
