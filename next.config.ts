import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by @opennextjs/cloudflare (Workers bundle reads .next/standalone).
  output: "standalone",
  // libsql file DB (local) + Neon serverless (Workers). Keep heavy pkgs external.
  serverExternalPackages: [
    "@libsql/client",
    "libsql",
    "better-sqlite3",
    "@libsql/linux-x64-gnu",
    "@libsql/linux-x64-musl",
    "@libsql/darwin-x64",
    "@libsql/darwin-arm64",
    "@libsql/win32-x64-msvc",
    "pg",
    "@neondatabase/serverless",
  ],
  // Allow LAN / localhost hosts in Next.js 16 dev (cross-origin checks).
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
};

export default nextConfig;

// OpenNext Cloudflare local bindings for `next dev` (no-op if unused).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
