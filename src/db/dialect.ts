/**
 * Hosted Cloudflare / Cursor apps set DATABASE_URL (Postgres).
 * Local / LAN double-click keeps SQLite via BABYALESTOCK_DATA_DIR when unset.
 *
 * On OpenNext Workers, runtime secrets must be Worker **Variables and Secrets**
 * (Production for `main` deploys; Previews only for non-production branches).
 * **Build** variables alone do NOT bind into the Worker — login then sees
 * hasDatabaseUrl: false.
 *
 * Never fall through to libsql `createClient` on workerd (_createClient3 crash).
 */

export function isCloudflareWorkerRuntime(): boolean {
  try {
    if (typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined") {
      return true;
    }
  } catch {
    /* ignore */
  }
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
    /* local Node / build / tests */
  }
  return false;
}

function readDatabaseUrlFromCloudflareEnv(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } =
      require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const raw = (ctx.env as Record<string, unknown> | undefined)?.DATABASE_URL;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    /* not in Workers request */
  }
  return null;
}

/** Diagnostic: is DATABASE_URL present on the CF env binding (not process.env)? */
export function cloudflareBindingHasDatabaseUrl(): boolean {
  return Boolean(readDatabaseUrlFromCloudflareEnv());
}

/**
 * Ensure `process.env.DATABASE_URL` is set from Cloudflare Worker bindings.
 * Safe no-op outside a Workers request context.
 */
export function syncHostedDatabaseUrlFromBindings(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  const fromBinding = readDatabaseUrlFromCloudflareEnv();
  if (fromBinding) {
    process.env.DATABASE_URL = fromBinding;
  }
}

export function isPostgres(): boolean {
  syncHostedDatabaseUrlFromBindings();
  if (isCloudflareWorkerRuntime()) return true;
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabaseUrl(): string | null {
  syncHostedDatabaseUrlFromBindings();
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

/** Spanish copy for missing runtime secret (main → Production, not Build / Previews-only). */
export const MISSING_DATABASE_URL_HINT =
  "Falta DATABASE_URL en el Worker en tiempo de ejecución. Cloudflare → babyalestock → Settings → Variables and Secrets → entorno Production (deploy de main) → Secret DATABASE_URL. No basta con variables de Build ni solo Previews Base. Guardá y volvé a desplegar main (Retry del tip bb33a94+).";
