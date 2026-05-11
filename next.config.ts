import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['archiver', 'better-sqlite3', '@prisma/adapter-better-sqlite3'],
};

export default nextConfig;
