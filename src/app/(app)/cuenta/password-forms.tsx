"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlashMessage } from "@/components/flash-message";

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

export function AdminResetPasswordForm({
  otherUsernames,
  initialError,
  initialOk,
}: {
  otherUsernames: string[];
  initialError?: string;
  initialOk?: string;
}) {
  const [pending, setPending] = useState(false);

  if (otherUsernames.length === 0) {
    return null;
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
          defaultValue={otherUsernames[0]}
        >
          {otherUsernames.map((name) => (
            <option key={name} value={name}>
              {name}
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
