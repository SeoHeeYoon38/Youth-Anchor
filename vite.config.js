import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        ws: true
      }
    }
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['haven-mark.svg', 'gaon-*.png', 'haven-2-5d-icons.png'],
      manifest: {
        name: 'Haven - 청소년 안전 지원',
        short_name: 'Haven',
        description: '위기청소년과 자립준비청년을 위한 익명 통합 지원 서비스',
        theme_color: '#dd8b80',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/haven-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ]
})
