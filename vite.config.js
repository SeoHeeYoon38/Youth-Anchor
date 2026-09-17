import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['helper-mark.svg'],
      manifest: {
        name: 'HELPER - 청소년 안전 지원',
        short_name: 'HELPER',
        description: '위기청소년과 자립준비청년을 위한 익명 통합 지원 서비스',
        theme_color: '#087f72',
        background_color: '#f4f7f6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/helper-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ]
})
