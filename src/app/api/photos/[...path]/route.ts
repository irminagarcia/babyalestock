import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPhotosDir } from "@/lib/paths";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { path: parts } = await context.params;
  const relative = parts.join("/");
  if (relative.includes("..")) {
    return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
  }

  const filePath = path.join(getPhotosDir(), relative);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
