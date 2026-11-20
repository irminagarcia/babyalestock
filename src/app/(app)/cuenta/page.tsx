import { ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  AdminResetPasswordForm,
  ChangeOwnPasswordForm,
} from "./password-forms";

export default async function CuentaPage() {
  const user = await requireUser();
  const isAdmin = user.username === "admin";

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

      <ChangeOwnPasswordForm />

      {isAdmin && <AdminResetPasswordForm otherUsernames={otherUsernames} />}
    </div>
  );
}
