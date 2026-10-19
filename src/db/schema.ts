import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/** Application users (local username/password). */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const subcategories = sqliteTable(
  "subcategories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("subcategories_cat_name_uidx").on(t.categoryId, t.name)],
);

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * Product usage in the boutique:
 * - individual: sold as a unit
 * - gift_component: used inside gift baskets
 * - both: either
 */
export const productUsageValues = [
  "individual",
  "gift_component",
  "both",
] as const;
export type ProductUsage = (typeof productUsageValues)[number];

export const productStatusValues = [
  "active",
  "discontinued",
  "archived",
] as const;
export type ProductStatus = (typeof productStatusValues)[number];

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    sku: text("sku"),
    barcode: text("barcode"),
    categoryId: integer("category_id").references(() => categories.id),
    subcategoryId: integer("subcategory_id").references(() => subcategories.id),
    brand: text("brand"),
    variant: text("variant"),
    size: text("size"),
    color: text("color"),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    purchaseCost: real("purchase_cost"),
    sellingPrice: real("selling_price"),
    currentStock: integer("current_stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    storageLocation: text("storage_location"),
    photoPath: text("photo_path"),
    notes: text("notes"),
    usage: text("usage").notNull().default("individual"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("products_sku_uidx").on(t.sku),
    index("products_barcode_idx").on(t.barcode),
    index("products_status_idx").on(t.status),
    index("products_brand_idx").on(t.brand),
    index("products_category_idx").on(t.categoryId),
  ],
);

export const movementTypeValues = [
  "received",
  "removed",
  "sale",
  "damaged",
  "return",
  "manual_correction",
] as const;
export type MovementType = (typeof movementTypeValues)[number];

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    type: text("type").notNull(),
    quantity: integer("quantity").notNull(),
    stockBefore: integer("stock_before").notNull(),
    stockAfter: integer("stock_after").notNull(),
    reason: text("reason"),
    occurredAt: text("occurred_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    userId: integer("user_id").references(() => users.id),
    /** Prevents accidental duplicate deductions on double-submit / retries. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("stock_movements_idempotency_uidx").on(t.idempotencyKey),
    index("stock_movements_product_idx").on(t.productId),
    index("stock_movements_occurred_idx").on(t.occurredAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Future-ready tables (schema only — not used by Milestone 1 UI)             */
/* -------------------------------------------------------------------------- */

export const giftBaskets = sqliteTable("gift_baskets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sku: text("sku"),
  assemblyMode: text("assembly_mode").notNull().default("mto"), // mto | preassembled
  sellingPrice: real("selling_price"),
  notes: text("notes"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const giftBasketComponents = sqliteTable(
  "gift_basket_components",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    basketId: integer("basket_id")
      .notNull()
      .references(() => giftBaskets.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [
    uniqueIndex("gift_basket_components_uidx").on(t.basketId, t.productId),
  ],
);

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalRef: text("external_ref"),
  source: text("source").notNull().default("manual"), // manual | woocommerce
  status: text("status").notNull().default("pending"),
  customerName: text("customer_name"),
  totalAmount: real("total_amount"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const orderLines = sqliteTable("order_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  basketId: integer("basket_id").references(() => giftBaskets.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price"),
});

export const woocommerceLinks = sqliteTable("woocommerce_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").references(() => products.id),
  wooProductId: text("woo_product_id"),
  wooSku: text("woo_sku"),
  lastSyncedAt: text("last_synced_at"),
  syncStatus: text("sync_status").default("pending"),
  notes: text("notes"),
});
