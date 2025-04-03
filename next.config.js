/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
await import("./src/env.js");

import { withLogtail } from "@logtail/next";

// Define Content Security Policy with clear grouping for better maintainability
const cspHeader = [
  // Default fallback
  "default-src 'self'",

  // Script execution contexts
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://*.posthog.com https://*.i.posthog.com",

  // Styling
  "style-src 'self' 'unsafe-inline'",

  // Media and images
  "img-src 'self' blob: data: https://vod.api.video https://lh3.googleusercontent.com",
  "media-src 'self' https://vod.api.video",
  "font-src 'self'",

  // Security restrictions
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",

  // Frame handling
  "frame-src https://withtitan.retool.com/",
  "frame-ancestors 'self' https://withtitan.retool.com/",

  // API and service connections
  "connect-src 'self' https://withtitan.retool.com/ https://*.posthog.com https://*.i.posthog.com https://va.vercel-scripts.com https://db.withtitan.com https://vitals.vercel-insights.com",

  // Protocol upgrade
  "upgrade-insecure-requests",
].join("; ");

/**
 * @type {import("next").NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ["vod.api.video", "lh3.googleusercontent.com"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes except webhooks
        source: "/:path((?!api/webhooks).*)*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Minimal security headers for webhook routes
        source: "/api/webhooks/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default withLogtail(nextConfig);
