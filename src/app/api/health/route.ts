import { NextResponse } from "next/server";
import { getDb, usingPostgres } from "@/db/client";
import { one } from "@/db/query";
import { ensureHostedSchema } from "@/db/ensure-hosted-schema";
import { suppliers, users } from "@/db/schema";
import {
  isCloudflareWorkerRuntime,
  syncHostedDatabaseUrlFromBindings,
} from "@/db/dialect";

export const dynamic = "force-dynamic";

/**
 * Lightweight hosted diagnostic — no secrets in the body.
 * Open /api/health after a Cloudflare deploy to see if Neon is reachable.
 */
export async function GET() {
  syncHostedDatabaseUrlFromBindings();
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const runtime = isCloudflareWorkerRuntime()
    ? "cloudflare-workers"
    : "node";

  let dbReachable: boolean | null = null;
  let dbError: string | undefined;
  let supplierFiscalReady: boolean | null = null;

  if (hasDatabaseUrl) {
    try {
      await ensureHostedSchema();
      const db = getDb();
      // Dialect-agnostic probe (LibSQL + Neon Drizzle handles).
      await one(db.select({ id: users.id }).from(users).limit(1));
      // Prove proveedores SELECT * path (tax_id / legal_name / …).
      await one(
        db.select({ taxId: suppliers.taxId }).from(suppliers).limit(1),
      );
      supplierFiscalReady = true;
      dbReachable = true;
    } catch (err) {
      dbReachable = false;
      supplierFiscalReady = false;
      const msg = err instanceof Error ? err.message : String(err);
      dbError = msg
        .replace(/postgresql:\/\/[^@\s]+@/gi, "postgresql://***@")
        .slice(0, 240);
    }
  } else if (runtime === "cloudflare-workers") {
    dbReachable = false;
    dbError =
      "DATABASE_URL missing in Worker runtime (set Production secret, then deploy latest main).";
  }

  const ok =
    runtime === "cloudflare-workers"
      ? hasDatabaseUrl && dbReachable === true
      : true;

  const gitSha =
    process.env.CF_PAGES_COMMIT_SHA?.trim() ||
    process.env.WORKERS_CI_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim() ||
    null;

  return NextResponse.json(
    {
      ok,
      runtime,
      dialect: usingPostgres() ? "postgres" : "sqlite",
      hasDatabaseUrl,
      dbReachable,
      supplierFiscalReady,
      gitSha,
      // Bump when shipping Workers fixes — confirms tip is live vs stale deploy.
      codeStamp: "ba33-category-stock-v1",
      ...(dbError ? { dbError } : {}),
      tip: "After merge: Cloudflare → babyalestock → Deployments → Retry tip of main. Expect codeStamp ba33-category-stock-v1 + hasDatabaseUrl/dbReachable true. Then: delete empty category (303 ok); Corregir existencias → 0 → Eliminar producto.",
    },
    { status: ok ? 200 : 503 },
  );
}
