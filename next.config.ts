import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
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
  // Prevent source maps from leaking source code in production
  productionBrowserSourceMaps: false,
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
      static: 60,
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
      // Tag shortcut → explore tag
      { source: '/tag/:slug', destination: '/explore/tag/:slug', permanent: true },
    ];
  },
  // Security headers to protect against common web vulnerabilities
  async headers() {
    const commonSecurityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '0' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()' },
    ];

    return [
      // All pages except /embed — block framing
      {
        source: '/:path((?!embed/).*)',
        headers: [
          ...commonSecurityHeaders,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.google-analytics.com https://tpc.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; media-src 'self' https://cdn.feedim.com https://imgspcdn.feedim.com https://*.r2.cloudflarestorage.com blob:; connect-src 'self' data: blob: https://*.supabase.co https://cdn.feedim.com https://imgspcdn.feedim.com https://*.r2.cloudflarestorage.com https://api.giphy.com https://unpkg.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.googletagmanager.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://csi.gstatic.com wss://*.supabase.co; font-src 'self' https://fonts.gstatic.com; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.openstreetmap.org; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" },
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
