"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlashMessage } from "@/components/flash-message";
import { roleLabel } from "@/lib/user-profile";

export function ProfileForm({
  displayName,
  username,
  initialError,
  initialOk,
}: {
  displayName: string;
  username: string;
  initialError?: string;
  initialOk?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action="/api/cuenta/profile"
      method="post"
      className="space-y-4 rounded-xl border bg-card p-6"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      <input type="hidden" name="returnTo" value="/cuenta" />
      <h2 className="font-display text-xl">Mi perfil</h2>
      <p className="text-sm text-muted-foreground">
        Cambie su <strong>nombre</strong> (cómo se ve en la app) y su{" "}
        <strong>usuario</strong> (para iniciar sesión).
      </p>
      <FlashMessage error={initialError} ok={initialOk} />
      <div className="space-y-2">
        <Label htmlFor="displayName">Nombre</Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          defaultValue={displayName}
          maxLength={80}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          defaultValue={username}
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9._\-]+"
          title="Letras, números, punto, guion o guion bajo"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}

export function ChangeOwnPasswordForm({
  initialError,
  initialOk,
}: {
  initialError?: string;
  initialOk?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action="/api/cuenta/password"
      method="post"
      className="space-y-4 rounded-xl border bg-card p-6"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      <input type="hidden" name="returnTo" value="/cuenta" />
      <h2 className="font-display text-xl">Cambiar mi contraseña</h2>
      <p className="text-sm text-muted-foreground">
        Indique su contraseña actual y la nueva (mínimo 6 caracteres).
      </p>
      <FlashMessage error={initialError} ok={initialOk} />
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Contraseña actual</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}

export function AdminCreateUserForm({
  initialError,
  initialOk,
}: {
  initialError?: string;
  initialOk?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action="/api/cuenta/create-user"
      method="post"
      className="space-y-4 rounded-xl border bg-card p-6"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      <input type="hidden" name="returnTo" value="/cuenta" />
      <h2 className="font-display text-xl">Alta de usuario de tienda</h2>
      <p className="text-sm text-muted-foreground">
        Solo administración. Crea un acceso nuevo para otra persona de la
        tienda (no administración).
      </p>
      <FlashMessage error={initialError} ok={initialOk} />
      <div className="space-y-2">
        <Label htmlFor="createDisplayName">Nombre</Label>
        <Input
          id="createDisplayName"
          name="displayName"
          type="text"
          maxLength={80}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="createUsername">Usuario</Label>
        <Input
          id="createUsername"
          name="username"
          type="text"
          autoComplete="off"
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9._\-]+"
          title="Letras, números, punto, guion o guion bajo"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="createPassword">Contraseña</Label>
        <Input
          id="createPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="createConfirmPassword">Confirmar contraseña</Label>
        <Input
          id="createConfirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Dar de alta"}
      </Button>
    </form>
  );
}

export function AdminResetPasswordForm({
  otherUsers,
  initialError,
  initialOk,
}: {
  otherUsers: { username: string; displayName: string }[];
  initialError?: string;
  initialOk?: string;
}) {
  const [pending, setPending] = useState(false);

  if (otherUsers.length === 0) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Restablecer otra contraseña</h2>
        <p className="text-sm text-muted-foreground">
          No hay otros usuarios. Cree uno arriba para poder restablecer su
          contraseña.
        </p>
      </div>
    );
  }

  return (
    <form
      action="/api/cuenta/admin-reset"
      method="post"
      className="space-y-4 rounded-xl border bg-card p-6"
      onSubmit={(e) => {
        if (!e.currentTarget.checkValidity()) return;
        setPending(true);
      }}
    >
      <input type="hidden" name="returnTo" value="/cuenta" />
      <h2 className="font-display text-xl">Restablecer otra contraseña</h2>
      <p className="text-sm text-muted-foreground">
        Solo administración. La otra persona deberá iniciar sesión de nuevo.
      </p>
      <FlashMessage error={initialError} ok={initialOk} />
      <div className="space-y-2">
        <Label htmlFor="targetUsername">Usuario</Label>
        <select
          id="targetUsername"
          name="targetUsername"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={otherUsers[0]?.username}
        >
          {otherUsers.map((u) => (
            <option key={u.username} value={u.username}>
              {u.displayName} ({u.username})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminNewPassword">Nueva contraseña</Label>
        <Input
          id="adminNewPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminConfirmPassword">Confirmar nueva contraseña</Label>
        <Input
          id="adminConfirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Restablecer contraseña"}
      </Button>
    </form>
  );
}

export function AdminUsersList({
  users,
  currentUsername,
  initialError,
  initialOk,
}: {
  users: { username: string; displayName: string; role: string }[];
  currentUsername: string;
  initialError?: string;
  initialOk?: string;
}) {
  const [confirmUser, setConfirmUser] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-6">
      <h2 className="font-display text-xl">Usuarios activos</h2>
      <p className="text-sm text-muted-foreground">
        Cuentas que pueden entrar en Baby Ale. Puede desactivar otra cuenta de
        tienda si ya no debe usarse (no se borra el historial).
      </p>
      <FlashMessage error={initialError} ok={initialOk} />
      <ul className="divide-y rounded-md border">
        {users.map((u) => {
          const isSelf = u.username === currentUsername;
          return (
            <li key={u.username} className="space-y-2 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{u.displayName}</span>
                  <span className="text-muted-foreground"> · {u.username}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {roleLabel(u.role)}
                  </span>
                  {!isSelf && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={pending}
                      onClick={() =>
                        setConfirmUser(
                          confirmUser === u.username ? null : u.username,
                        )
                      }
                    >
                      Desactivar
                    </Button>
                  )}
                </span>
              </div>
              {confirmUser === u.username && (
                <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    ¿Desactivar «{u.displayName}» ({u.username})? No podrá
                    iniciar sesión. El historial de stock se conserva.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <form
                      action="/api/cuenta/deactivate"
                      method="post"
                      onSubmit={() => setPending(true)}
                    >
                      <input type="hidden" name="returnTo" value="/cuenta" />
                      <input
                        type="hidden"
                        name="targetUsername"
                        value={u.username}
                      />
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                      >
                        {pending ? "Desactivando…" : "Confirmar desactivación"}
                      </Button>
                    </form>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setConfirmUser(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
