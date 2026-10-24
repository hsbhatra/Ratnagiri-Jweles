import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Proxy target follows the backend's PORT (backend/.env), so changing the API port
// doesn't silently break every /api call. API_PROXY_TARGET overrides it.
function backendTarget() {
  if (process.env.API_PROXY_TARGET) return process.env.API_PROXY_TARGET
  try {
    const envFile = fs.readFileSync(new URL('../backend/.env', import.meta.url), 'utf8')
    const port = envFile.match(/^\s*PORT\s*=\s*(\d+)/m)?.[1]
    if (port) return `http://localhost:${port}`
  } catch {
    // no backend/.env — fall back to the default port
  }
  return 'http://localhost:5000'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin API calls in dev, so the SameSite=strict session cookies just work.
    // In production the host (Vercel/Netlify) rewrites /api/* to the backend the same way.
    proxy: {
      '/api': { target: backendTarget(), changeOrigin: false },
    },
  },
})
