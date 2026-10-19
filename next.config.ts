import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Allow LAN / localhost hosts in Next.js 16 dev (cross-origin checks).
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
};
