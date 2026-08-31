import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  }
})
