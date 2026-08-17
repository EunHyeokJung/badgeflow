import type { NextConfig } from "next";

const isStaticExport =
  process.env.STATIC_EXPORT === "true" ||
  process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  ...(isStaticExport
    ? {
        output: "export",
        ...(basePath ? { basePath } : {}),
        trailingSlash: true,
      }
    : {}),
  images: {
    dangerouslyAllowSVG: false,
    unoptimized: isStaticExport,
  },
};

export default nextConfig;
