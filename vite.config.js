import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isPwaEnabled = !['1', 'true'].includes((process.env.VITE_DISABLE_PWA ?? '').toLowerCase())

async function cargarPluginPwa() {
  if (!isPwaEnabled) {
    return []
  }

  const { VitePWA } = await import('vite-plugin-pwa')
  return [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['legel-learning-icon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'LegeLearning | Libro Hespérides',
        short_name: 'LegeLearning',
        description: 'Libro y archivo personal, gratuito, instalable y local-first.',
        lang: 'es-ES',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1c1917',
        theme_color: '#1c1917',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ]
}

const version = '1.10.0'

export default defineConfig(async () => ({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  base: process.env.VITE_BASE ?? '/',
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    ...(await cargarPluginPwa()),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/**/*.test.ts', 'src/engine/types.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
}))
