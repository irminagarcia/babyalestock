import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/** Application users (local username/password). role: admin | staff */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"),
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
  /** NIF/CIF */
  taxId: text("tax_id"),
  /** Razón social */
  legalName: text("legal_name"),
  /** Dirección fiscal */
  fiscalAddress: text("fiscal_address"),
  /** País */
  country: text("country").default("España"),
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
    /** Precio de compra (neto unitario de referencia / última compra). */
    purchaseCost: real("purchase_cost"),
    /**
     * Coste de adquisición (landed) — media ponderada de entregas confirmadas.
     * Usar para beneficio estimado; no incluye IVA recuperable.
     */
    landedCost: real("landed_cost"),
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
    /** Optional link: e.g. delivery_line + line id */
    sourceType: text("source_type"),
    sourceId: integer("source_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
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

/** Entrada de proveedor (entrega) — cabecera. */
export const supplierDeliveries = sqliteTable(
  "supplier_deliveries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    deliveryDate: text("delivery_date").notNull(),
    reference: text("reference"),
    shippingCost: real("shipping_cost").notNull().default(0),
    otherCosts: real("other_costs").notNull().default(0),
    allocationMethod: text("allocation_method").notNull().default("by_net_value"),
    status: text("status").notNull().default("draft"),
    notes: text("notes"),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    confirmedAt: text("confirmed_at"),
    confirmedByUserId: integer("confirmed_by_user_id").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("supplier_deliveries_supplier_idx").on(t.supplierId),
    index("supplier_deliveries_status_idx").on(t.status),
    index("supplier_deliveries_date_idx").on(t.deliveryDate),
  ],
);

/** Líneas de entrega — precio de compra, IVA, coste de adquisición calculado. */
export const supplierDeliveryLines = sqliteTable(
  "supplier_delivery_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deliveryId: integer("delivery_id")
      .notNull()
      .references(() => supplierDeliveries.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    /** Precio de compra neto unitario (EUR). */
    unitPurchaseNet: real("unit_purchase_net").notNull(),
    /** Tipo de IVA / impuesto configurable (%). */
    vatRate: real("vat_rate").notNull().default(21),
    /** true = IVA recuperable (no entra en coste de adquisición). */
    vatRecoverable: integer("vat_recoverable", { mode: "boolean" })
      .notNull()
      .default(true),
    lineNet: real("line_net").notNull().default(0),
    vatAmount: real("vat_amount").notNull().default(0),
    allocatedOverhead: real("allocated_overhead").notNull().default(0),
    nonRecoverableTax: real("non_recoverable_tax").notNull().default(0),
    landedUnitCost: real("landed_unit_cost").notNull().default(0),
    stockMovementId: integer("stock_movement_id").references(
      () => stockMovements.id,
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("supplier_delivery_lines_delivery_idx").on(t.deliveryId),
    index("supplier_delivery_lines_product_idx").on(t.productId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Gift basket recipes (M2 Phase 2) + assembly stubs (cost freeze later)      */
/* -------------------------------------------------------------------------- */

export const basketStatusValues = ["active", "inactive", "draft"] as const;
export type BasketStatus = (typeof basketStatusValues)[number];

/**
 * Reusable gift-basket recipe.
 * Estimated component cost is computed live from product landed costs — not stored.
 * Editing does not deduct stock and does not rewrite historical movements.
 */
export const giftBaskets = sqliteTable(
  "gift_baskets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    sku: text("sku"),
    description: text("description"),
    /** mto | preassembled — hint for future assembly workflow */
    assemblyMode: text("assembly_mode").notNull().default("mto"),
    sellingPrice: real("selling_price"),
    notes: text("notes"),
    /** active | inactive | draft */
    status: text("status").notNull().default("active"),
    /** Finished baskets on hand (preassembled path). */
    finishedStock: integer("finished_stock").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("gift_baskets_sku_uidx").on(t.sku),
    index("gift_baskets_status_idx").on(t.status),
  ],
);

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

/**
 * Recorded basket assemblies with frozen cost/revenue snapshots.
 * Recipe edits must not rewrite these rows.
 */
export const giftBasketAssemblies = sqliteTable(
  "gift_basket_assemblies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    basketId: integer("basket_id")
      .notNull()
      .references(() => giftBaskets.id),
    quantity: integer("quantity").notNull().default(1),
    /** Frozen total component cost **per basket unit** at assemble time */
    totalComponentCostSnapshot: real("total_component_cost_snapshot"),
    sellingPriceSnapshot: real("selling_price_snapshot"),
    recipeNameSnapshot: text("recipe_name_snapshot"),
    assemblyMode: text("assembly_mode").notNull().default("preassembled"),
    assembledAt: text("assembled_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    assembledByUserId: integer("assembled_by_user_id").references(() => users.id),
    notes: text("notes"),
    /** recorded | cancelled */
    status: text("status").notNull().default("recorded"),
    /** Prevents double-confirm of the same client submit */
    idempotencyKey: text("idempotency_key").notNull(),
    cancelledAt: text("cancelled_at"),
    cancelledByUserId: integer("cancelled_by_user_id").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("gift_basket_assemblies_idempotency_uidx").on(t.idempotencyKey),
    index("gift_basket_assemblies_basket_idx").on(t.basketId),
    index("gift_basket_assemblies_assembled_idx").on(t.assembledAt),
    index("gift_basket_assemblies_status_idx").on(t.status),
  ],
);

export const giftBasketAssemblyLines = sqliteTable(
  "gift_basket_assembly_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assemblyId: integer("assembly_id")
      .notNull()
      .references(() => giftBasketAssemblies.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    /** Total units consumed (= recipe qty × assembly qty) */
    quantity: integer("quantity").notNull(),
    recipeQtyPerUnit: integer("recipe_qty_per_unit").notNull().default(1),
    /** Frozen landed unit cost at assemble time */
    unitLandedCostSnapshot: real("unit_landed_cost_snapshot").notNull(),
    lineCostSnapshot: real("line_cost_snapshot").notNull(),
    stockMovementId: integer("stock_movement_id").references(
      () => stockMovements.id,
    ),
  },
  (t) => [index("gift_basket_assembly_lines_assembly_idx").on(t.assemblyId)],
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
