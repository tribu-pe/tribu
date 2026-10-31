import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        // Runs on every commit: Rules, Value Objects, calculations, golden XML.
        test: { name: 'unit', include: ['src/**/*.test.ts', 'test/golden/**/*.test.ts'] },
      },
      {
        // Talks to SUNAT beta: manual or nightly only, never blocks a pull request.
        test: {
          name: 'beta',
          include: ['test/beta/**/*.test.ts'],
          testTimeout: 60_000,
          // Milestone 0: beta answered HTTP 401 to parallel sends; one request at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
