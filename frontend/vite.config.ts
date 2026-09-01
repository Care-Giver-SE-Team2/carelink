/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 开发时把 /api 打到本地后端，避免跨域配置
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    // Windows 上默认的 threads 池会出现 worker 超时，固定用 forks
    pool: 'forks',
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['**/*.config.*', '**/main.tsx', '**/*.d.ts', 'dist/**'],
    },
  },
})
