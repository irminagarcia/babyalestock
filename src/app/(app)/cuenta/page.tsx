import { ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  AdminResetPasswordForm,
  ChangeOwnPasswordForm,
} from "./password-forms";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; form?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const isAdmin = user.username === "admin";
  const isAdminFlash = query.form === "admin";

  const otherUsernames = isAdmin
    ? (
        await getDb()
          .select({ username: users.username })
          .from(users)
          .where(ne(users.username, "admin"))
      ).map((r) => r.username)
    : [];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Cuenta</h1>
        <p className="text-muted-foreground">
          Sesión de <strong>{user.displayName}</strong> ({user.username}).
          Cambie su contraseña aquí; no deje las contraseñas por defecto en la
          red local.
        </p>
      </div>

      <ChangeOwnPasswordForm
        initialError={!isAdminFlash ? query.error : undefined}
        initialOk={!isAdminFlash ? query.ok : undefined}
      />

      {isAdmin && (
        <AdminResetPasswordForm
          otherUsernames={otherUsernames}
          initialError={isAdminFlash ? query.error : undefined}
          initialOk={isAdminFlash ? query.ok : undefined}
        />
      )}
    </div>
  );
}
