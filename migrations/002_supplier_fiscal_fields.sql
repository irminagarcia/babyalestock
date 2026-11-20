-- BA-22: supplier fiscal data + country (additive; local SQLite uses drizzle/0004)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS fiscal_address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'España';
