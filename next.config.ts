import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@googleapis/drive", "@googleapis/sheets", "google-auth-library"],
};

export default nextConfig;
