import { revalidatePath } from "next/cache";

/**
 * Best-effort cache bust after a successful mutation.
 * On OpenNext Cloudflare Workers, revalidatePath can throw even when the DB
 * write already committed — never let that surface as a user-facing failure
 * (hard 303 is the source of truth for UI).
 */
export function safeRevalidate(...paths: string[]): void {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // ignore
    }
  }
}
