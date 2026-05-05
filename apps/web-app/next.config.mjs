import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ui"],
  outputFileTracingRoot: __dirname,
  // Disable ESLint during build to avoid errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: __dirname, // Ensures correct tracing for monorepo dependencies

  webpack: (config) => {
    // Fix for resolving symlinks in pnpm
    config.resolve.symlinks = false;

    return config;
  },
  redirects: async () => {
    return [
      {
        source: "/reviews",
        destination: "/dashboard/rating",
        permanent: true,
      },
      {
        source: "/cenik",
        destination: "/dashboard/pricing",
        permanent: true,
      },
      {
        source: "/zamestnani",
        destination: "/dashboard/jobs/full-time",
        permanent: true,
      },
      {
        source: "/my-profile",
        destination: "/dashboard/profile",
        permanent: true,
      },
      {
        source: "/dlouhodobe-brigady",
        destination: "/dashboard/jobs/long-time",
        permanent: true,
      },
      {
        source: "/jednorazove-brigady",
        destination: "/dashboard/jobs/one-time",
        permanent: true,
      },
      {
        source: "/jednorazove-brigady/:id",
        destination: "/dashboard/jobs/one-time/:id",
        permanent: true,
      },
      {
        source: "/dlouhodobe-brigady/:id",
        destination: "/dashboard/jobs/long-time/:id",
        permanent: true,
      },
      {
        source: "/zamestnani/:id",
        destination: "/dashboard/jobs/full-time/:id",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "quickjobs-l3",
  project: "web-app",
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
});
