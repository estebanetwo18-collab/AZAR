import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@googleapis/drive", "@googleapis/sheets", "google-auth-library"],
  // Los análisis semanales se leen del disco en la API: incluirlos en la función de Vercel.
  outputFileTracingIncludes: {
    "/api/analisis-semanal": ["./data/analisis-semanal/*.json"],
  },
};

export default nextConfig;
