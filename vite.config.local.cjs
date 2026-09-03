const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  base: process.env.VITE_BASE || '/',
  server: {
    port: Number(process.env.PORT) || 4173,
    host: '127.0.0.1',
  },
  plugins: [react()],
})
