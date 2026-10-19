import type { ProductStatus, ProductUsage } from "@/db/schema";

export const productCsvHeaders = [
  "nombre",
  "sku",
  "codigo_barras",
  "categoria",
  "subcategoria",
  "marca",
  "variante",
  "talla",
  "color",
  "proveedor",
  "coste_compra",
  "precio_venta",
  "existencias",
  "stock_minimo",
  "ubicacion",
  "uso",
  "estado",
  "notas",
] as const;

export type ProductCsvRow = {
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  brand: string | null;
  variant: string | null;
  size: string | null;
  color: string | null;
  supplierName: string | null;
  purchaseCost: number | null;
  sellingPrice: number | null;
  currentStock: number;
  minStock: number;
  storageLocation: string | null;
  usage: ProductUsage | string;
  status: ProductStatus | string;
  notes: string | null;
};

export function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function productsToCsv(rows: ProductCsvRow[]): string {
  const lines = [productCsvHeaders.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.sku,
        row.barcode,
        row.categoryName,
        row.subcategoryName,
        row.brand,
        row.variant,
        row.size,
        row.color,
        row.supplierName,
        row.purchaseCost,
        row.sellingPrice,
        row.currentStock,
        row.minStock,
        row.storageLocation,
        row.usage,
        row.status,
        row.notes,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    current.push(field);
    field = "";
  };
  const pushRow = () => {
    // skip fully empty trailing rows
    if (current.length === 1 && current[0] === "" && rows.length > 0) {
      current = [];
      return;
    }
    rows.push(current);
    current = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushField();
      pushRow();
    } else if (ch === "\r") {
      // ignore
    } else {
      field += ch;
    }
  }
  if (field.length || current.length) {
    pushField();
    pushRow();
  }
  return rows;
}

export function mapCsvHeaders(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    map[h.trim().toLowerCase()] = i;
  });
  return map;
}
