"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

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

  const result = await login(username, password);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(next.startsWith("/") ? next : "/panel");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}
