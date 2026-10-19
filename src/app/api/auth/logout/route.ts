import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function POST(request: Request) {
  await logout();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
