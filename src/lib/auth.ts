import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getDb, usingPostgres } from "@/db/client";
import { one } from "@/db/query";
import { sessions, users } from "@/db/schema";
import { runMigrations } from "@/db/migrate";

export const SESSION_COOKIE = "babyalestock_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
};

export function isAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

async function ensureDb() {
  // Hosted Postgres: migrate ONLY via scripts/migrate.mjs after `next build`.
  // Never migrate from getSession/auth — Next parallel page collection races
  // CREATE TABLE IF NOT EXISTS on pg_type (23505).
  if (usingPostgres()) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.BABYALESTOCK_SKIP_MIGRATE === "1") return;
  await runMigrations();
}

function useSecureCookies(): boolean {
  if (process.env.BABYALESTOCK_SECURE_COOKIE === "1") return true;
  if (process.env.BABYALESTOCK_SECURE_COOKIE === "0") return false;
  // Hosted HTTPS (Cloudflare / any DATABASE_URL deploy): secure cookies in production.
  return (
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.DATABASE_URL?.trim())
  );
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    expires,
    secure: useSecureCookies(),
  };
}

/**
 * Validates credentials and creates a session row.
 * Returns session id so route handlers can attach Set-Cookie on the Response.
 */
export async function createSession(
  username: string,
  password: string,
): Promise<
  | { ok: true; user: SessionUser; sessionId: string; expires: Date }
  | { ok: false; error: string }
> {
  await ensureDb();
  const db = getDb();
  const user = await one(
    db
      .select()
      .from(users)
      .where(and(eq(users.username, username.trim()), eq(users.isActive, true))),
  );

  if (!user) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  const sessionId = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt: expires.toISOString(),
  });

  return {
    ok: true,
    sessionId,
    expires,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role || (user.username === "admin" ? "admin" : "staff"),
    },
  };
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const result = await createSession(username, password);
  if (!result.ok) return result;

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    result.sessionId,
    sessionCookieOptions(result.expires),
  );

  return { ok: true, user: result.user };
}

export async function logout(): Promise<void> {
  await ensureDb();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  await ensureDb();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const now = new Date().toISOString();
  const row = await one(
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        expiresAt: sessions.expiresAt,
        isActive: users.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now))),
  );

  if (!row || !row.isActive) {
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role || (row.username === "admin" ? "admin" : "staff"),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}