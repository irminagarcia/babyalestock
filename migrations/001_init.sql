-- Baby Ale stock — full schema for hosted Postgres (fresh DB).
-- Additive only; do not edit after publish — add 002_*.sql instead.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_cat_name_uidx ON subcategories (category_id, name);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  legal_name TEXT,
  fiscal_address TEXT,
  country TEXT DEFAULT 'España',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category_id INTEGER REFERENCES categories(id),
  subcategory_id INTEGER REFERENCES subcategories(id),
  brand TEXT,
  variant TEXT,
  size TEXT,
  color TEXT,
  supplier_id INTEGER REFERENCES suppliers(id),
  purchase_cost DOUBLE PRECISION,
  landed_cost DOUBLE PRECISION,
  selling_price DOUBLE PRECISION,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  storage_location TEXT,
  photo_path TEXT,
  notes TEXT,
  usage TEXT NOT NULL DEFAULT 'individual',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_uidx ON products (sku);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON products (barcode);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT,
  occurred_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  user_id INTEGER REFERENCES users(id),
  idempotency_key TEXT NOT NULL,
  source_type TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_idempotency_uidx ON stock_movements (idempotency_key);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_occurred_idx ON stock_movements (occurred_at);
CREATE INDEX IF NOT EXISTS stock_movements_source_idx ON stock_movements (source_type, source_id);

CREATE TABLE IF NOT EXISTS supplier_deliveries (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  delivery_date TEXT NOT NULL,
  reference TEXT,
  shipping_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  other_costs DOUBLE PRECISION NOT NULL DEFAULT 0,
  allocation_method TEXT NOT NULL DEFAULT 'by_net_value',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by_user_id INTEGER REFERENCES users(id),
  confirmed_at TEXT,
  confirmed_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS supplier_deliveries_supplier_idx ON supplier_deliveries (supplier_id);
CREATE INDEX IF NOT EXISTS supplier_deliveries_status_idx ON supplier_deliveries (status);
CREATE INDEX IF NOT EXISTS supplier_deliveries_date_idx ON supplier_deliveries (delivery_date);

CREATE TABLE IF NOT EXISTS supplier_delivery_lines (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL REFERENCES supplier_deliveries(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_purchase_net DOUBLE PRECISION NOT NULL,
  vat_rate DOUBLE PRECISION NOT NULL DEFAULT 21,
  vat_recoverable BOOLEAN NOT NULL DEFAULT TRUE,
  line_net DOUBLE PRECISION NOT NULL DEFAULT 0,
  vat_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  allocated_overhead DOUBLE PRECISION NOT NULL DEFAULT 0,
  non_recoverable_tax DOUBLE PRECISION NOT NULL DEFAULT 0,
  landed_unit_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  stock_movement_id INTEGER REFERENCES stock_movements(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS supplier_delivery_lines_delivery_idx ON supplier_delivery_lines (delivery_id);
CREATE INDEX IF NOT EXISTS supplier_delivery_lines_product_idx ON supplier_delivery_lines (product_id);

CREATE TABLE IF NOT EXISTS gift_baskets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  assembly_mode TEXT NOT NULL DEFAULT 'mto',
  selling_price DOUBLE PRECISION,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  finished_stock INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX IF NOT EXISTS gift_baskets_sku_uidx ON gift_baskets (sku);
CREATE INDEX IF NOT EXISTS gift_baskets_status_idx ON gift_baskets (status);

CREATE TABLE IF NOT EXISTS gift_basket_components (
  id SERIAL PRIMARY KEY,
  basket_id INTEGER NOT NULL REFERENCES gift_baskets(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS gift_basket_components_uidx ON gift_basket_components (basket_id, product_id);
CREATE INDEX IF NOT EXISTS gift_basket_components_product_idx ON gift_basket_components (product_id);

CREATE TABLE IF NOT EXISTS gift_basket_assemblies (
  id SERIAL PRIMARY KEY,
  basket_id INTEGER NOT NULL REFERENCES gift_baskets(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_component_cost_snapshot DOUBLE PRECISION,
  selling_price_snapshot DOUBLE PRECISION,
  recipe_name_snapshot TEXT,
  assembly_mode TEXT NOT NULL DEFAULT 'preassembled',
  assembled_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  assembled_by_user_id INTEGER REFERENCES users(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  idempotency_key TEXT NOT NULL,
  cancelled_at TEXT,
  cancelled_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX IF NOT EXISTS gift_basket_assemblies_idempotency_uidx ON gift_basket_assemblies (idempotency_key);
CREATE INDEX IF NOT EXISTS gift_basket_assemblies_basket_idx ON gift_basket_assemblies (basket_id);
CREATE INDEX IF NOT EXISTS gift_basket_assemblies_assembled_idx ON gift_basket_assemblies (assembled_at);
CREATE INDEX IF NOT EXISTS gift_basket_assemblies_status_idx ON gift_basket_assemblies (status);

CREATE TABLE IF NOT EXISTS gift_basket_assembly_lines (
  id SERIAL PRIMARY KEY,
  assembly_id INTEGER NOT NULL REFERENCES gift_basket_assemblies(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  recipe_qty_per_unit INTEGER NOT NULL DEFAULT 1,
  unit_landed_cost_snapshot DOUBLE PRECISION NOT NULL,
  line_cost_snapshot DOUBLE PRECISION NOT NULL,
  stock_movement_id INTEGER REFERENCES stock_movements(id)
);
CREATE INDEX IF NOT EXISTS gift_basket_assembly_lines_assembly_idx ON gift_basket_assembly_lines (assembly_id);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  external_ref TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  total_amount DOUBLE PRECISION,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS order_lines (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  basket_id INTEGER REFERENCES gift_baskets(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS woocommerce_links (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  woo_product_id TEXT,
  woo_sku TEXT,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'pending',
  notes TEXT
);
