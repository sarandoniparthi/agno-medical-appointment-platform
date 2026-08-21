import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['tsconfig.base.json'] })],
  test: {
    name: 'database',
    environment: 'node',
    include: ['libs/database/src/**/*.spec.ts'],
  },
});
