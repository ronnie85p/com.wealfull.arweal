import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const prodEnv = existsSync('.env.production')
    ? loadEnv('production', process.cwd(), '')
    : {}
  const effective = { ...env, ...prodEnv }
  const prodDefine = Object.fromEntries(
    Object.entries(prodEnv)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  )
  const proxyHost = effective.API_PROXY_HOST || '127.0.0.1'
  const proxyPort = effective.API_PROXY_PORT || '8000'
  return {
    base: '/',
    plugins: [react()],
    define: prodDefine,
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: false,
    },
    server: {
      host: effective.VITE_HOST || 'localhost',
      port: Number(effective.VITE_PORT || 5173),
      proxy: {
        '/a/api': {
          target: `http://${proxyHost}:${proxyPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/a/, ''),
        },
      },
    },
  }
})