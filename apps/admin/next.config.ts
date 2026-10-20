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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [
                { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
                // Internal tool with no third-party scripts: lock it down. Next needs inline bootstrap scripts/styles.
                { key: 'Content-Security-Policy', value: [`default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' https: data: blob:`, `font-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`].join('; ') },
              ]
            : []),
        ],
      },
    ];
  },
};

export default config;
