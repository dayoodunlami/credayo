import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  define: {
    // Define Cesium base URL for proper asset loading
    CESIUM_BASE_URL: JSON.stringify('/cesium/')
  },
  optimizeDeps: {
    // Pre-bundle Cesium for faster dev server startup
    include: ['cesium']
  }
})
