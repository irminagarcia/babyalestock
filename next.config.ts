import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql (aliased as better-sqlite3) + platform NAPI prebuilds
  serverExternalPackages: [
    "better-sqlite3",
    "libsql",
    "@libsql/linux-x64-gnu",
    "@libsql/linux-x64-musl",
    "@libsql/darwin-x64",
    "@libsql/darwin-arm64",
    "@libsql/win32-x64-msvc",
  ],
  // Allow LAN / localhost hosts in Next.js 16 dev (cross-origin checks).
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
};

export default nextConfig;
