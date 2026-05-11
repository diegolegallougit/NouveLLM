import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['archiver', 'better-sqlite3', '@prisma/adapter-better-sqlite3'],
  allowedDevOrigins: ['100.120.16.114', '192.168.1.90'],
};

export default nextConfig;
