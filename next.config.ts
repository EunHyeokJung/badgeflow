import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: "/lanyardstudio",
        trailingSlash: true,
      }
    : {}),
  images: {
    dangerouslyAllowSVG: false,
    unoptimized: isGitHubPages,
  },
};

export default nextConfig;
