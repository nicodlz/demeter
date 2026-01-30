import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy IBKR Flex Web Service to avoid CORS issues in dev
      '/api/ibkr': {
        target: 'https://ndcdyn.interactivebrokers.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ibkr/, '/AccountManagement/FlexWebService'),
        secure: true,
      },
    },
  },
})
