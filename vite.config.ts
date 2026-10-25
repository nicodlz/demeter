import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // pdf-lib is a large, lazily-loaded dependency (PDF import/export only).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-is"],
          "vendor-router": ["@tanstack/react-router"],
          "vendor-charts": ["recharts"],
          "vendor-jspdf": ["jspdf"],
          "vendor-pdf-lib": ["pdf-lib"],
          "vendor-jszip": ["jszip"],
          "vendor-vault": ["@ursalock/client", "@ursalock/crypto"],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  server: {
    proxy: {
      // Proxy IBKR Flex Web Service to avoid CORS issues in dev
      "/api/ibkr": {
        target: "https://ndcdyn.interactivebrokers.com",
        changeOrigin: true,
        rewrite: (p) =>
          p.replace(/^\/api\/ibkr/, "/AccountManagement/FlexWebService"),
        secure: true,
      },
    },
  },
});
