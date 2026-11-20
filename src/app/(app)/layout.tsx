import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

// Auth + DB must run per-request. Avoid static prerender calling migrate/auth
// under parallel Next workers (Cloudflare Pages / OpenNext builds).
export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <AppShell userName={user.displayName}>{children}</AppShell>;
}
