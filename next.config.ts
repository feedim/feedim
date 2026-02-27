import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ['@tensorflow/tfjs', 'jpeg-js', 'pngjs', '@anthropic-ai/sdk', 'sharp'],
  // Prepare for next/image optimization (Supabase Storage domain)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'imgspcdn.feedim.com',
      },
    ],
  },
  // Strip console.* calls from client-side production bundles
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  // Enable experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@emoji-mart/react', 'emoji-mart'],
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  // 301 Redirects for old URL structure
  async redirects() {
    return [
      // Write → Create (more specific, must come first)
      { source: '/dashboard/write/:path*', destination: '/create/:path*', permanent: true },
      { source: '/dashboard/write', destination: '/create', permanent: true },
      // Payment rename
      { source: '/dashboard/payment', destination: '/app-payment', permanent: true },
      // Post → root slug
      { source: '/post/:slug/moderation', destination: '/:slug/moderation', permanent: true },
      { source: '/post/:slug', destination: '/:slug', permanent: true },
      // Moments detail → feed view (moments are designed for scroll experience)
      { source: '/moments/:slug', destination: '/moments?s=:slug', permanent: false },
    ];
  },
  // Security headers to protect against common web vulnerabilities
  async headers() {
    const commonSecurityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    return [
      // All pages except /embed — block framing
      {
        source: '/:path((?!embed/).*)',
        headers: [
          ...commonSecurityHeaders,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://www.paytr.com;" },
        ]
      },
      // /embed/* — allow framing from anywhere (no X-Frame-Options, permissive CSP)
      {
        source: '/embed/:path*',
        headers: [
          ...commonSecurityHeaders,
          { key: 'Content-Security-Policy', value: "frame-ancestors *; base-uri 'self';" },
        ]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
