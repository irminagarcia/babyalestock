import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { isAdmin, requireUser } from "@/lib/auth";
import {
  AdminCreateUserForm,
  AdminResetPasswordForm,
  AdminUsersList,
  ChangeOwnPasswordForm,
  ProfileForm,
} from "./password-forms";

function sectionFlash(
  query: { error?: string; ok?: string; form?: string },
  formName: string,
) {
  const active = query.form === formName;
  return {
    error: active ? query.error : undefined,
    ok: active ? query.ok : undefined,
  };
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; form?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const admin = isAdmin(user);

  const profileFlash = sectionFlash(query, "profile");
  const passwordFlash = sectionFlash(query, "password");
  const createFlash = sectionFlash(query, "create");
  const adminResetFlash = sectionFlash(query, "admin");
  const deactivateFlash = sectionFlash(query, "deactivate");

  const allUsers = admin
    ? await getDb()
        .select({
          username: users.username,
          displayName: users.displayName,
          role: users.role,
        })
        .from(users)
        .where(eq(users.isActive, true))
    : [];

  const otherUsers = allUsers
    .filter((u) => u.username !== user.username)
    .map((u) => ({ username: u.username, displayName: u.displayName }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Cuenta</h1>
        <p className="text-muted-foreground">
          Sesión de <strong>{user.displayName}</strong> ({user.username}). Aquí
          puede cambiar su nombre, su usuario de acceso y su contraseña
          {admin
            ? ", y dar de alta a otra persona de la tienda."
            : "."}
        </p>
      </div>

      <ProfileForm
        displayName={user.displayName}
        username={user.username}
        initialError={profileFlash.error}
        initialOk={profileFlash.ok}
      />

      <ChangeOwnPasswordForm
        initialError={passwordFlash.error}
        initialOk={passwordFlash.ok}
      />

      {admin && (
        <>
          <div id="administracion">
            <h2 className="font-display text-2xl">Administración</h2>
            <p className="text-sm text-muted-foreground">
              Más abajo: listado, <strong>Alta de usuario de tienda</strong> y
              restablecer contraseñas. Solo visible con cuenta de administración
              (usuario <code>admin</code>).
            </p>
          </div>
          <AdminUsersList
            currentUsername={user.username}
            users={allUsers.map((u) => ({
              username: u.username,
              displayName: u.displayName,
              role: u.role || (u.username === "admin" ? "admin" : "staff"),
            }))}
            initialError={deactivateFlash.error}
            initialOk={deactivateFlash.ok}
          />
          <AdminCreateUserForm
            initialError={createFlash.error}
            initialOk={createFlash.ok}
          />
          <AdminResetPasswordForm
            otherUsers={otherUsers}
            initialError={adminResetFlash.error}
            initialOk={adminResetFlash.ok}
          />
        </>
      )}
    </div>
  );
}
