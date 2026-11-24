"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import {
  createSession,
  isAdmin,
  logout,
  requireUser,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getDb } from "@/db/client";
import { exec, one } from "@/db/query";
import { sessions, users } from "@/db/schema";
import {
  isAdminRole,
  validateDisplayName,
  validateNewPassword,
  validateUsername,
} from "@/lib/user-profile";

export type LoginState = {
  error?: string;
};

export type PasswordActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/panel") || "/panel";

  if (!username || !password) {
    return { error: "Indique usuario y contraseña." };
  }

  const result = await createSession(username, password);
  if (!result.ok) {
    return { error: result.error };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    result.sessionId,
    sessionCookieOptions(result.expires),
  );

  redirect(next.startsWith("/") ? next : "/panel");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}

/** Logged-in user updates display name and/or username. */
export async function updateOwnProfile(
  formData: FormData,
): Promise<PasswordActionResult> {
  const user = await requireUser();
  const nameResult = validateDisplayName(
    String(formData.get("displayName") ?? ""),
  );
  if (!nameResult.ok) return nameResult;
  const userResult = validateUsername(String(formData.get("username") ?? ""));
  if (!userResult.ok) return userResult;

  const db = getDb();
  if (userResult.username !== user.username) {
    const taken = await one(
      db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.username, userResult.username),
            ne(users.id, user.id),
          ),
        ),
    );
    if (taken) {
      return {
        ok: false,
        error: `El usuario «${userResult.username}» ya está en uso.`,
      };
    }
  }

  await exec(
    db
      .update(users)
      .set({
        displayName: nameResult.displayName,
        username: userResult.username,
      })
      .where(eq(users.id, user.id)),
  );

  return { ok: true, message: "Perfil actualizado." };
}

/** Logged-in user changes their own password (current password required). */
export async function changeOwnPassword(
  formData: FormData,
): Promise<PasswordActionResult> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    return { ok: false, error: "Indique su contraseña actual." };
  }
  const pwd = validateNewPassword(newPassword, confirmPassword);
  if (!pwd.ok) return pwd;

  const db = getDb();
  const row = await one(db.select().from(users).where(eq(users.id, user.id)));
  if (!row) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const valid = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!valid) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await exec(
    db.update(users).set({ passwordHash }).where(eq(users.id, user.id)),
  );

  return { ok: true, message: "Contraseña actualizada." };
}

/**
 * Admin can set another user's password without knowing the old one.
 * Invalidates that user's sessions.
 */
export async function adminResetPassword(
  formData: FormData,
): Promise<PasswordActionResult> {
  const actor = await requireUser();
  if (!isAdmin(actor)) {
    return {
      ok: false,
      error: "Solo administración puede restablecer otras contraseñas.",
    };
  }

  const targetUsername = String(formData.get("targetUsername") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!targetUsername) {
    return { ok: false, error: "Seleccione un usuario." };
  }
  const pwd = validateNewPassword(newPassword, confirmPassword);
  if (!pwd.ok) return pwd;

  const db = getDb();
  const target = await one(
    db.select().from(users).where(eq(users.username, targetUsername)),
  );
  if (!target) {
    return { ok: false, error: "Usuario no encontrado." };
  }
  if (target.id === actor.id) {
    return {
      ok: false,
      error: "Use «Cambiar mi contraseña» para su propia cuenta.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await exec(
    db.update(users).set({ passwordHash }).where(eq(users.id, target.id)),
  );
  await exec(db.delete(sessions).where(eq(sessions.userId, target.id)));

  return {
    ok: true,
    message: `Contraseña de «${target.username}» restablecida. Deberá iniciar sesión de nuevo.`,
  };
}

/** Admin creates a new staff user. */
export async function adminCreateUser(
  formData: FormData,
): Promise<PasswordActionResult> {
  const actor = await requireUser();
  if (!isAdmin(actor)) {
    return {
      ok: false,
      error: "Solo administración puede crear usuarios.",
    };
  }

  const nameResult = validateDisplayName(
    String(formData.get("displayName") ?? ""),
  );
  if (!nameResult.ok) return nameResult;
  const userResult = validateUsername(String(formData.get("username") ?? ""));
  if (!userResult.ok) return userResult;
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const pwd = validateNewPassword(newPassword, confirmPassword);
  if (!pwd.ok) return pwd;

  const db = getDb();
  const taken = await one(
    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, userResult.username)),
  );
  if (taken) {
    return {
      ok: false,
      error: `El usuario «${userResult.username}» ya existe.`,
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await exec(
    db.insert(users).values({
      username: userResult.username,
      displayName: nameResult.displayName,
      passwordHash,
      role: "staff",
      isActive: true,
    }),
  );

  return {
    ok: true,
    message: `Usuario «${userResult.username}» creado.`,
  };
}

function userLooksAdmin(row: {
  role: string | null;
  username: string;
}): boolean {
  return isAdminRole(row.role) || row.username === "admin";
}

/**
 * Admin soft-deactivates another user (is_active=false) and clears sessions.
 * Hard delete is intentionally omitted — stock/delivery history FKs reference users.
 * Refuses self and refuses locking out the last active admin.
 */
export async function adminDeactivateUser(
  formData: FormData,
): Promise<PasswordActionResult> {
  const actor = await requireUser();
  if (!isAdmin(actor)) {
    return {
      ok: false,
      error: "Solo administración puede desactivar usuarios.",
    };
  }

  const targetUsername = String(formData.get("targetUsername") ?? "").trim();
  if (!targetUsername) {
    return { ok: false, error: "Seleccione un usuario." };
  }

  const db = getDb();
  const target = await one(
    db.select().from(users).where(eq(users.username, targetUsername)),
  );
  if (!target || !target.isActive) {
    return { ok: false, error: "Usuario no encontrado o ya inactivo." };
  }
  if (target.id === actor.id) {
    return {
      ok: false,
      error: "No puede desactivar su propia cuenta.",
    };
  }

  if (userLooksAdmin(target)) {
    const activeUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .where(eq(users.isActive, true));
    const activeAdminCount = activeUsers.filter(userLooksAdmin).length;
    if (activeAdminCount <= 1) {
      return {
        ok: false,
        error:
          "No se puede desactivar el último usuario de administración. Cree otro administrador primero.",
      };
    }
  }

  await exec(
    db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, target.id)),
  );
  await exec(db.delete(sessions).where(eq(sessions.userId, target.id)));

  return {
    ok: true,
    message: `Usuario «${target.username}» desactivado. Ya no podrá iniciar sesión.`,
  };
}
