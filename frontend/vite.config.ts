import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const baseEnv = loadEnv('__base__', process.cwd(), '')
  const modeEnv = loadEnv(mode, process.cwd(), '')
  const effective = { ...baseEnv, ...modeEnv }
  const define = Object.fromEntries(
    Object.entries(effective)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  )
  const proxyHost = effective.API_PROXY_HOST || '127.0.0.1'
  const proxyPort = effective.API_PROXY_PORT || '8000'
  return {
    base: '/',
    plugins: [react()],
    define,
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