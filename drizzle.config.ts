import { defineConfig } from "drizzle-kit";
import { getDbPath, ensureDataDirs } from "./src/lib/paths";

ensureDataDirs();

export default defineConfig({
  schema: "./src/db/schema.sqlite.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: getDbPath(),
  },
});
