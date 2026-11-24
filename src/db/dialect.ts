/**
 * Hosted Cloudflare / Cursor apps set DATABASE_URL (Postgres).
 * Local / LAN double-click keeps SQLite via BABYALESTOCK_DATA_DIR when unset.
 *
 * On OpenNext Workers, secrets land in the Worker `env` binding and are copied
 * into `process.env` by the adapter — but we also pull from
 * `getCloudflareContext().env` as a fallback when Retry/redeploy leaves
 * process.env empty for secrets.
 *
 * Critical: never fall through to libsql `createClient` on workerd — that is the
 * `_createClient3` crash in worker.js after a bad Retry deploy.
 */

export function isCloudflareWorkerRuntime(): boolean {
  // 1) workerd global (most reliable on CF Workers)
  try {
    if (typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined") {
      return true;
    }
  } catch {
    /* ignore */
  }
  // 2) UA string
  try {
    if (
      typeof navigator !== "undefined" &&
      /Cloudflare-Workers/i.test(String(navigator.userAgent ?? ""))
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  // 3) OpenNext Worker bindings present
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } =
      require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const env = ctx?.env as Record<string, unknown> | undefined;
    if (
      env &&
      ("ASSETS" in env ||
        "WORKER_SELF_REFERENCE" in env ||
        typeof env.DATABASE_URL === "string")
    ) {
      return true;
    }
  } catch {
    /* Not in a Workers request (local Node, build, unit tests). */
  }
  return false;
}

/**
 * Ensure `process.env.DATABASE_URL` is set from Cloudflare bindings when present.
 * Safe no-op outside a Workers request context.
 */
export function syncHostedDatabaseUrlFromBindings(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } =
      require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const raw = (ctx.env as Record<string, unknown>).DATABASE_URL;
    if (typeof raw === "string" && raw.trim()) {
      process.env.DATABASE_URL = raw.trim();
    }
  } catch {
    // Not running inside a Workers request (local Node, build, unit tests).
  }
}

export function isPostgres(): boolean {
  syncHostedDatabaseUrlFromBindings();
  // On Workers we ALWAYS use Neon/Postgres — never libsql file DB.
  if (isCloudflareWorkerRuntime()) return true;
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabaseUrl(): string | null {
  syncHostedDatabaseUrlFromBindings();
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}
