import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    // Handle /order/:id/success routes
    proxy: {
      '/order': {
        target: 'http://localhost:3002',
        bypass: (req) => {
          // Serve success.html for /order/{id}/success paths
          if (req.url?.match(/\/order\/[^/]+\/success/)) {
            return '/success.html';
          }
        },
      },
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'RestaurantChatWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000'),
  },
})
