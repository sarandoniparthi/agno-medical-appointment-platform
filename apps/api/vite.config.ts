import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: 'apps/api',
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/apps/api' },
  },
});
