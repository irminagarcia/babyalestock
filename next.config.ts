import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql file DB (local) + pg (hosted). Keep NAPI packages external.
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
  ],
  // Allow LAN / localhost hosts in Next.js 16 dev (cross-origin checks).
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
};

export default nextConfig;
