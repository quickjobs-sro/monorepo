import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.wixstatic.com", pathname: "/media/**" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    staleTimes: { dynamic: 30 },
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
  redirects: async () => [
    {
      source: "/detail/:id(\\d+)",
      destination: "/jobs/detail/:id",
      statusCode: 301,
    },
  ],
};

export default withSentryConfig(nextConfig, {
  org: "quickjobs-l3",
  project: "public-jobs",
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
});
