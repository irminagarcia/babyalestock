import { NextResponse } from "next/server";
import { getDb, usingPostgres } from "@/db/client";
import { one } from "@/db/query";
import { users } from "@/db/schema";
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

  if (hasDatabaseUrl) {
    try {
      const db = getDb();
      // Dialect-agnostic probe (LibSQL + Neon Drizzle handles).
      await one(db.select({ id: users.id }).from(users).limit(1));
      dbReachable = true;
    } catch (err) {
      dbReachable = false;
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

  return NextResponse.json(
    {
      ok,
      runtime,
      dialect: usingPostgres() ? "postgres" : "sqlite",
      hasDatabaseUrl,
      dbReachable,
      ...(dbError ? { dbError } : {}),
      tip: "If preview <version>-babyalestock.*.workers.dev works but babyalestock.*.workers.dev fails: Deployments → promote that Version ID to 100% production traffic. Do not Retry an old SHA.",
    },
    { status: ok ? 200 : 503 },
  );
}
