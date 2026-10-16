import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/schemas', '@repo/utils'],
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    // Breakpoints that match our layouts (cap at 1920 — no 4K requests for placeholders).
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 160, 240, 320],
  },
  experimental: { optimizePackageImports: ['lucide-react', 'motion', 'radix-ui'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;
