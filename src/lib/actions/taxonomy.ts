"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exec } from "@/db/query";
import { categories, subcategories, suppliers } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function createCategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) return { ok: false as const, error: "El nombre es obligatorio." };
  try {
    await exec(getDb().insert(categories).values({ name, description }));
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
    await exec(getDb().insert(subcategories).values({ name, categoryId }));
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
  await exec(
    getDb()
      .insert(suppliers)
      .values({
        name,
        contactName: String(formData.get("contactName") || "").trim() || null,
        email: String(formData.get("email") || "").trim() || null,
        phone: String(formData.get("phone") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null,
      }),
  );
  } catch {
    return { ok: false as const, error: "Ya existe un proveedor con ese nombre." };
  }
  revalidatePath("/proveedores");
  revalidatePath("/productos");
  return { ok: true as const };
}

export async function toggleCategory(id: number, isActive: boolean) {
  await requireUser();
  await exec(
    getDb()
      .update(categories)
      .set({ isActive })
      .where(eq(categories.id, id)),
  );
  revalidatePath("/categorias");
  return { ok: true as const };
}

export async function toggleSupplier(id: number, isActive: boolean) {
  await requireUser();
  await exec(
    getDb()
      .update(suppliers)
      .set({ isActive })
      .where(eq(suppliers.id, id)),
  );
  revalidatePath("/proveedores");
  return { ok: true as const };
}
