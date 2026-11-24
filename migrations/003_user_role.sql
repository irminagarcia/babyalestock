-- BA-27: user role so admin survives username changes
-- (local SQLite uses drizzle/0005_user_role.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff';
UPDATE users SET role = 'admin' WHERE username = 'admin';
