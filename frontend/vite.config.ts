import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyHost = env.API_PROXY_HOST || '127.0.0.1'
  const proxyPort = env.API_PROXY_PORT || '8000'
  return {
    base: './',
    plugins: [react()],
    server: {
      host: env.VITE_HOST || 'localhost',
      port: Number(env.VITE_PORT || 5173),
      proxy: {
        '/api': {
          target: `http://${proxyHost}:${proxyPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})