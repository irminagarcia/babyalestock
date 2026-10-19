import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { runMigrations } from "@/db/migrate";

const SESSION_COOKIE = "babyalestock_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
};

function ensureDb() {
  runMigrations();
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  ensureDb();
  const db = getDb();
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.username, username.trim()), eq(users.isActive, true)))
    .get();

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

  db.insert(sessions)
    .values({
      id: sessionId,
      userId: user.id,
      expiresAt: expires.toISOString(),
    })
    .run();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    // Secure only in production over HTTPS; LAN HTTP needs secure:false
    secure: process.env.NODE_ENV === "production" && process.env.BABYALESTOCK_SECURE_COOKIE === "1",
  });

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    },
  };
}

export async function logout(): Promise<void> {
  ensureDb();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    getDb().delete(sessions).where(eq(sessions.id, sessionId)).run();
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  ensureDb();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const now = new Date().toISOString();
  const row = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .get();

  if (!row || !row.isActive) {
    if (sessionId) {
      db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    }
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
