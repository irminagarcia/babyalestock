/** BA-27: profile field validation (shared by actions + tests). */

export type UserRole = "admin" | "staff";

export const MIN_PASSWORD_LENGTH = 6;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 32;
export const MAX_DISPLAY_NAME_LENGTH = 80;

const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateUsername(
  raw: string,
): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(raw);
  if (!username) {
    return { ok: false, error: "Indique un nombre de usuario." };
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return {
      ok: false,
      error: `El usuario debe tener al menos ${MIN_USERNAME_LENGTH} caracteres.`,
    };
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return {
      ok: false,
      error: `El usuario no puede superar ${MAX_USERNAME_LENGTH} caracteres.`,
    };
  }
  if (/\s/.test(username) || !USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "El usuario solo puede contener letras, números, punto, guion y guion bajo.",
    };
  }
  return { ok: true, username };
}

export function validateDisplayName(
  raw: string,
): { ok: true; displayName: string } | { ok: false; error: string } {
  const displayName = normalizeDisplayName(raw);
  if (!displayName) {
    return { ok: false, error: "Indique un nombre para mostrar." };
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      ok: false,
      error: `El nombre no puede superar ${MAX_DISPLAY_NAME_LENGTH} caracteres.`,
    };
  }
  return { ok: true, displayName };
}

export function validateNewPassword(
  newPassword: string,
  confirmPassword: string,
): { ok: true } | { ok: false; error: string } {
  if (!newPassword || !confirmPassword) {
    return { ok: false, error: "Complete la contraseña y su confirmación." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "La confirmación no coincide." };
  }
  return { ok: true };
}

export function roleLabel(role: string): string {
  return isAdminRole(role) ? "Administración" : "Tienda";
}
