import { NextResponse } from "next/server";
import { getDb, usingPostgres } from "@/db/client";
import { one } from "@/db/query";
import { users } from "@/db/schema";
import {
  isCloudflareWorkerRuntime,
  syncHostedDatabaseUrlFromBindings,
  cloudflareBindingHasDatabaseUrl,
  MISSING_DATABASE_URL_HINT,
} from "@/db/dialect";

export const dynamic = "force-dynamic";

/**
 * Hosted diagnostic — no secret values.
 * Use after CF deploy to see if Neon is bound at **runtime**.
 */
export async function GET() {
  syncHostedDatabaseUrlFromBindings();
  const processEnvHasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const cfBindingHasDatabaseUrl = cloudflareBindingHasDatabaseUrl();
  const hasDatabaseUrl = processEnvHasDatabaseUrl || cfBindingHasDatabaseUrl;
  const runtime = isCloudflareWorkerRuntime()
    ? "cloudflare-workers"
    : "node";

  let dbReachable: boolean | null = null;
  let dbError: string | undefined;

  if (hasDatabaseUrl) {
    try {
      const db = getDb();
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
    dbError = MISSING_DATABASE_URL_HINT;
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
      processEnvHasDatabaseUrl,
      cfBindingHasDatabaseUrl,
      dbReachable,
      ...(dbError ? { dbError } : {}),
      tip: "main / workers.dev / version previews of main use Production RUNTIME secrets — not Build vars, not Previews Base alone. Settings → Variables and Secrets → Production → Secret DATABASE_URL → redeploy main tip.",
    },
    { status: ok ? 200 : 503 },
  );
}
