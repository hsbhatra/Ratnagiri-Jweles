import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    fileParallelism: false, // integration tests share one database
    testTimeout: 30000,
    hookTimeout: 120000, // first run downloads the in-memory MongoDB binary
  },
})
