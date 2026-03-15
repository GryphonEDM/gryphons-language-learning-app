import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// Use HTTPS if local certs exist (needed for Web Speech API on some browsers)
const certPath = '.cert/cert.pem'
const keyPath = '.cert/key.pem'
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    ...(hasSSL && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      }
    }),
    open: true,
    proxy: {
      '/tts': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/stt': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/llm': {
        target: 'http://localhost:1234/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm/, '')
      }
    }
  }
})
