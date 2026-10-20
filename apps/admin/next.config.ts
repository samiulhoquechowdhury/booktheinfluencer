import type { NextConfig } from 'next';
// Fail fast on bad environment variables (trd §11).
import './lib/env';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/schemas', '@repo/utils'],
  experimental: { optimizePackageImports: ['lucide-react', 'radix-ui'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Internal tool: never indexed (trd §10).
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default config;
