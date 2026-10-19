"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSession,
  logout,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

export type LoginState = {
  error?: string;
};

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
