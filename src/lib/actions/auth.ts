"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  createSession,
  logout,
  requireUser,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";

export type LoginState = {
  error?: string;
};

export type PasswordActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const MIN_PASSWORD_LENGTH = 6;

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

/** Logged-in user changes their own password (current password required). */
export async function changeOwnPassword(
  formData: FormData,
): Promise<PasswordActionResult> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: "Complete todos los campos." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "La confirmación no coincide." };
  }

  const db = getDb();
  const row = db.select().from(users).where(eq(users.id, user.id)).get();
  if (!row) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const valid = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!valid) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id))
    .run();

  return { ok: true, message: "Contraseña actualizada." };
}

/**
 * Admin (username `admin`) can set another user's password without knowing
 * the old one. Invalidates that user's sessions.
 */
export async function adminResetPassword(
  formData: FormData,
): Promise<PasswordActionResult> {
  const actor = await requireUser();
  if (actor.username !== "admin") {
    return {
      ok: false,
      error: "Solo administración puede restablecer otras contraseñas.",
    };
  }

  const targetUsername = String(formData.get("targetUsername") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!targetUsername || !newPassword || !confirmPassword) {
    return { ok: false, error: "Complete todos los campos." };
  }
  if (targetUsername === "admin") {
    return {
      ok: false,
      error: "Use «Cambiar mi contraseña» para su propia cuenta.",
    };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "La confirmación no coincide." };
  }

  const db = getDb();
  const target = db
    .select()
    .from(users)
    .where(eq(users.username, targetUsername))
    .get();
  if (!target) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, target.id))
    .run();
  db.delete(sessions).where(eq(sessions.userId, target.id)).run();

  return {
    ok: true,
    message: `Contraseña de «${target.username}» restablecida. Deberá iniciar sesión de nuevo.`,
  };
}
