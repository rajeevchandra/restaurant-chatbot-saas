import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        widget: resolve(__dirname, 'src/index.tsx'),
        embed: resolve(__dirname, 'src/embed.ts'),
      },
      name: 'RestaurantChatWidget',
      formats: ['iife'],
      fileName: (format, entryName) => `${entryName}.js`,
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
