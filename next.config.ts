import type { NextConfig } from "next";

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

export default nextConfig;
