import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Booting Nest + Prisma is slow on the NTFS dev mount; give hooks room.
  test: { include: ['test/**/*.test.ts', 'src/**/*.test.ts'], environment: 'node', hookTimeout: 60_000, testTimeout: 20_000 },
});
