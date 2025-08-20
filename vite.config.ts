import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7000,
    proxy: {
      '/api': { // Proxy requests starting with /api
        target: 'https://21370ce76b3f.ngrok-free.app ', // Your Flask API URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix
      },
    },
  },
});