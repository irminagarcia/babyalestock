/**
 * App-facing schema exports.
 * Local (no DATABASE_URL): SQLite tables.
 * Hosted (DATABASE_URL set): Postgres tables with the same names/shapes.
 * drizzle-kit generate uses schema.sqlite.ts via drizzle.config.ts.
 */
import { isPostgres } from "./dialect";
import * as sqlite from "./schema.sqlite";
import * as pg from "./schema.pg";

const usePg = isPostgres();
const s = (usePg ? pg : sqlite) as typeof sqlite;

export const users = s.users;
export const sessions = s.sessions;
export const categories = s.categories;
export const subcategories = s.subcategories;
export const suppliers = s.suppliers;
export const products = s.products;
export const stockMovements = s.stockMovements;
export const supplierDeliveries = s.supplierDeliveries;
export const supplierDeliveryLines = s.supplierDeliveryLines;
export const giftBaskets = s.giftBaskets;
export const giftBasketComponents = s.giftBasketComponents;
export const giftBasketAssemblies = s.giftBasketAssemblies;
export const giftBasketAssemblyLines = s.giftBasketAssemblyLines;
export const orders = s.orders;
export const orderLines = s.orderLines;
export const woocommerceLinks = s.woocommerceLinks;

export const productUsageValues = sqlite.productUsageValues;
export type ProductUsage = sqlite.ProductUsage;
export const productStatusValues = sqlite.productStatusValues;
export type ProductStatus = sqlite.ProductStatus;
export const movementTypeValues = sqlite.movementTypeValues;
export type MovementType = sqlite.MovementType;
export const allocationMethodValues = sqlite.allocationMethodValues;
export type AllocationMethod = sqlite.AllocationMethod;
export const deliveryStatusValues = sqlite.deliveryStatusValues;
export type DeliveryStatus = sqlite.DeliveryStatus;
export const basketStatusValues = sqlite.basketStatusValues;
export type BasketStatus = sqlite.BasketStatus;
export const assemblyStatusValues = sqlite.assemblyStatusValues;
export type AssemblyStatus = sqlite.AssemblyStatus;
export const assemblyModeValues = sqlite.assemblyModeValues;
export type AssemblyMode = sqlite.AssemblyMode;
