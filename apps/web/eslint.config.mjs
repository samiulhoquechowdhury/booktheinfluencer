import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'eslint.config.mjs'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/\\b[Bb]ook [Nn]ow\\b|[Ii]nstant(ly)? [Bb]ook/]",
          message: 'Never write "Book Now" / "Instant booking" (rules.md §0.6).',
        },
      ],
    },
  },
  { files: ['**/*.test.ts'], rules: { 'no-restricted-syntax': 'off' } },
];

export default config;
