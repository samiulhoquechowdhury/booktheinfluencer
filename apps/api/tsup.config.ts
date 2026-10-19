import { defineConfig } from 'tsup';

/**
 * Production build: one ESM bundle. Workspace packages (@repo/*) ship as TypeScript source, so
 * they're bundled in; npm dependencies (including the generated Prisma client) stay external and
 * load from node_modules.
 */
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  noExternal: [/^@repo\//],
  external: ['@prisma/client', '.prisma/client'],
});
