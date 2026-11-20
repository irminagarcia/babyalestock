import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/** Application users (local username/password). */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now() AT TIME ZONE 'utc')`),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now() AT TIME ZONE 'utc')`),
});

export const subcategories = pgTable(
  "subcategories",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [uniqueIndex("subcategories_cat_name_uidx").on(t.categoryId, t.name)],
);

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  /** NIF/CIF */
  taxId: text("tax_id"),
  /** Razón social */
  legalName: text("legal_name"),
  /** Dirección fiscal */
  fiscalAddress: text("fiscal_address"),
  /** País */
  country: text("country").default("España"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now() AT TIME ZONE 'utc')`),
});

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

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
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
    purchaseCost: doublePrecision("purchase_cost"),
    landedCost: doublePrecision("landed_cost"),
    sellingPrice: doublePrecision("selling_price"),
    currentStock: integer("current_stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    storageLocation: text("storage_location"),
    photoPath: text("photo_path"),
    notes: text("notes"),
    usage: text("usage").notNull().default("individual"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
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

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
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
      .default(sql`(now() AT TIME ZONE 'utc')`),
    userId: integer("user_id").references(() => users.id),
    idempotencyKey: text("idempotency_key").notNull(),
    sourceType: text("source_type"),
    sourceId: integer("source_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [
    uniqueIndex("stock_movements_idempotency_uidx").on(t.idempotencyKey),
    index("stock_movements_product_idx").on(t.productId),
    index("stock_movements_occurred_idx").on(t.occurredAt),
    index("stock_movements_source_idx").on(t.sourceType, t.sourceId),
  ],
);

export const allocationMethodValues = ["by_net_value", "by_quantity"] as const;
export type AllocationMethod = (typeof allocationMethodValues)[number];

export const deliveryStatusValues = ["draft", "confirmed", "cancelled"] as const;
export type DeliveryStatus = (typeof deliveryStatusValues)[number];

export const supplierDeliveries = pgTable(
  "supplier_deliveries",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    deliveryDate: text("delivery_date").notNull(),
    reference: text("reference"),
    shippingCost: doublePrecision("shipping_cost").notNull().default(0),
    otherCosts: doublePrecision("other_costs").notNull().default(0),
    allocationMethod: text("allocation_method").notNull().default("by_net_value"),
    status: text("status").notNull().default("draft"),
    notes: text("notes"),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    confirmedAt: text("confirmed_at"),
    confirmedByUserId: integer("confirmed_by_user_id").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [
    index("supplier_deliveries_supplier_idx").on(t.supplierId),
    index("supplier_deliveries_status_idx").on(t.status),
    index("supplier_deliveries_date_idx").on(t.deliveryDate),
  ],
);

export const supplierDeliveryLines = pgTable(
  "supplier_delivery_lines",
  {
    id: serial("id").primaryKey(),
    deliveryId: integer("delivery_id")
      .notNull()
      .references(() => supplierDeliveries.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitPurchaseNet: doublePrecision("unit_purchase_net").notNull(),
    vatRate: doublePrecision("vat_rate").notNull().default(21),
    vatRecoverable: boolean("vat_recoverable").notNull().default(true),
    lineNet: doublePrecision("line_net").notNull().default(0),
    vatAmount: doublePrecision("vat_amount").notNull().default(0),
    allocatedOverhead: doublePrecision("allocated_overhead").notNull().default(0),
    nonRecoverableTax: doublePrecision("non_recoverable_tax").notNull().default(0),
    landedUnitCost: doublePrecision("landed_unit_cost").notNull().default(0),
    stockMovementId: integer("stock_movement_id").references(
      () => stockMovements.id,
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [
    index("supplier_delivery_lines_delivery_idx").on(t.deliveryId),
    index("supplier_delivery_lines_product_idx").on(t.productId),
  ],
);

export const basketStatusValues = ["active", "inactive", "draft"] as const;
export type BasketStatus = (typeof basketStatusValues)[number];

export const giftBaskets = pgTable(
  "gift_baskets",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sku: text("sku"),
    description: text("description"),
    assemblyMode: text("assembly_mode").notNull().default("mto"),
    sellingPrice: doublePrecision("selling_price"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    finishedStock: integer("finished_stock").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [
    uniqueIndex("gift_baskets_sku_uidx").on(t.sku),
    index("gift_baskets_status_idx").on(t.status),
  ],
);

export const giftBasketComponents = pgTable(
  "gift_basket_components",
  {
    id: serial("id").primaryKey(),
    basketId: integer("basket_id")
      .notNull()
      .references(() => giftBaskets.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("gift_basket_components_uidx").on(t.basketId, t.productId),
    index("gift_basket_components_product_idx").on(t.productId),
  ],
);

export const assemblyStatusValues = ["recorded", "cancelled"] as const;
export type AssemblyStatus = (typeof assemblyStatusValues)[number];

export const assemblyModeValues = ["mto", "preassembled"] as const;
export type AssemblyMode = (typeof assemblyModeValues)[number];

export const giftBasketAssemblies = pgTable(
  "gift_basket_assemblies",
  {
    id: serial("id").primaryKey(),
    basketId: integer("basket_id")
      .notNull()
      .references(() => giftBaskets.id),
    quantity: integer("quantity").notNull().default(1),
    totalComponentCostSnapshot: doublePrecision("total_component_cost_snapshot"),
    sellingPriceSnapshot: doublePrecision("selling_price_snapshot"),
    recipeNameSnapshot: text("recipe_name_snapshot"),
    assemblyMode: text("assembly_mode").notNull().default("preassembled"),
    assembledAt: text("assembled_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
    assembledByUserId: integer("assembled_by_user_id").references(() => users.id),
    notes: text("notes"),
    status: text("status").notNull().default("recorded"),
    idempotencyKey: text("idempotency_key").notNull(),
    cancelledAt: text("cancelled_at"),
    cancelledByUserId: integer("cancelled_by_user_id").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'utc')`),
  },
  (t) => [
    uniqueIndex("gift_basket_assemblies_idempotency_uidx").on(t.idempotencyKey),
    index("gift_basket_assemblies_basket_idx").on(t.basketId),
    index("gift_basket_assemblies_assembled_idx").on(t.assembledAt),
    index("gift_basket_assemblies_status_idx").on(t.status),
  ],
);

export const giftBasketAssemblyLines = pgTable(
  "gift_basket_assembly_lines",
  {
    id: serial("id").primaryKey(),
    assemblyId: integer("assembly_id")
      .notNull()
      .references(() => giftBasketAssemblies.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    recipeQtyPerUnit: integer("recipe_qty_per_unit").notNull().default(1),
    unitLandedCostSnapshot: doublePrecision("unit_landed_cost_snapshot").notNull(),
    lineCostSnapshot: doublePrecision("line_cost_snapshot").notNull(),
    stockMovementId: integer("stock_movement_id").references(
      () => stockMovements.id,
    ),
  },
  (t) => [index("gift_basket_assembly_lines_assembly_idx").on(t.assemblyId)],
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  externalRef: text("external_ref"),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("pending"),
  customerName: text("customer_name"),
  totalAmount: doublePrecision("total_amount"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now() AT TIME ZONE 'utc')`),
});

export const orderLines = pgTable("order_lines", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  basketId: integer("basket_id").references(() => giftBaskets.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: doublePrecision("unit_price"),
});

export const woocommerceLinks = pgTable("woocommerce_links", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  wooProductId: text("woo_product_id"),
  wooSku: text("woo_sku"),
  lastSyncedAt: text("last_synced_at"),
  syncStatus: text("sync_status").default("pending"),
  notes: text("notes"),
});
