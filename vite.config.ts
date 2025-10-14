import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web'

  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@renderer': path.resolve(__dirname, './src/renderer')
      }
    },
    server: {
      port: 5173
    },
    optimizeDeps: {
      exclude: ['better-sqlite3', 'pdfkit']
    },
    build: isWeb
      ? {
          rollupOptions: {
            input: path.resolve(__dirname, 'index.html')
          }
        }
      : undefined
  }
})

