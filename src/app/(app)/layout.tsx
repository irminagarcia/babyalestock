import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ensureHostedSchema } from "@/db/ensure-hosted-schema";

// Auth + DB must run per-request. Avoid static prerender calling migrate/auth
// under parallel Next workers (Cloudflare Pages / OpenNext builds).
export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Neon may miss build-time migrate when DATABASE_URL is runtime-only.
  // Idempotent ADD COLUMN for supplier fiscal (002) + user.role (003).
  await ensureHostedSchema();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <AppShell userName={user.displayName}>{children}</AppShell>;
}
