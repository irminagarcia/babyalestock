import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import {
  categories,
  products,
  subcategories,
  suppliers,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { productsToCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .select({
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      brand: products.brand,
      variant: products.variant,
      size: products.size,
      color: products.color,
      purchaseCost: products.purchaseCost,
      sellingPrice: products.sellingPrice,
      currentStock: products.currentStock,
      minStock: products.minStock,
      storageLocation: products.storageLocation,
      usage: products.usage,
      status: products.status,
      notes: products.notes,
      categoryName: categories.name,
      subcategoryName: subcategories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .all();

  const csv = productsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="productos-babyalestock.csv"',
    },
  });
}
